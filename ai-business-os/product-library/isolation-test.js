"use strict";

const assert = require("node:assert/strict");
const { getConcept } = require("./index");

function createMockDb() {
  const memberships = [
    {
      business_id: "business-A",
      user_id: "user-A",
      business_role: "OWNER"
    }
  ];

  const models = [
    {
      id: "model-A",
      business_id: "business-A",
      model_name: "Sofa A"
    },
    {
      id: "model-B",
      business_id: "business-B",
      model_name: "Sofa B"
    }
  ];

  const queries = [];

  return {
    queries,

    from(table) {
      const filters = {};

      const query = {
        select() {
          return query;
        },

        eq(column, value) {
          filters[column] = value;
          return query;
        },

        async maybeSingle() {
          queries.push({
            table,
            filters: { ...filters }
          });

          const rows =
            table === "ai_business_members"
              ? memberships
              : table === "ai_product_models"
                ? models
                : [];

          const data = rows.find(row =>
            Object.entries(filters).every(
              ([key, value]) => row[key] === value
            )
          ) || null;

          return { data, error: null };
        }
      };

      return query;
    }
  };
}

async function run() {
  const db = createMockDb();

  const ownModel = await getConcept({
    db,
    userId: "user-A",
    businessId: "business-A",
    modelId: "model-A"
  });

  assert.equal(ownModel.success, true);
  assert.equal(ownModel.model.id, "model-A");

  const foreignModel = await getConcept({
    db,
    userId: "user-A",
    businessId: "business-A",
    modelId: "model-B"
  });

  assert.equal(foreignModel.success, false);
  assert.equal(foreignModel.error, "MODEL_NOT_FOUND");

  const foreignBusiness = await getConcept({
    db,
    userId: "user-A",
    businessId: "business-B",
    modelId: "model-B"
  });

  assert.equal(foreignBusiness.success, false);
  assert.equal(foreignBusiness.error, "ACCESS_DENIED");

  const outsider = await getConcept({
    db,
    userId: "user-B",
    businessId: "business-A",
    modelId: "model-A"
  });

  assert.equal(outsider.success, false);
  assert.equal(outsider.error, "ACCESS_DENIED");

  const modelQueries = db.queries.filter(
    item => item.table === "ai_product_models"
  );

  assert.equal(modelQueries.length, 2);

  for (const query of modelQueries) {
    assert.equal(
      query.filters.business_id,
      "business-A"
    );
  }

  console.log("✅ BUSINESS ISOLATION TEST PASSED");
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
