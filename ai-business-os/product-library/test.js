"use strict";

const assert = require("node:assert/strict");
const { saveConcept, listConcepts } = require("./index");

function mockDb(role) {
  const calls = [];

  const db = {
    from(table) {
      calls.push({ method: "from", value: table });

      const query = {
        select(value) {
          calls.push({ method: "select", value });
          return query;
        },
        eq(column, value) {
          calls.push({ method: "eq", column, value });
          return query;
        },
        insert(value) {
          calls.push({ method: "insert", value });
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return Promise.resolve({
            data: [],
            error: null
          });
        },
        single() {
          return Promise.resolve({
            data: {
              id: "model-1",
              development_status: "AWAITING_RENDER"
            },
            error: null
          });
        },
        maybeSingle() {
          return Promise.resolve({
            data: role
              ? {
                  business_id: "business-1",
                  user_id: "user-1",
                  business_role: role
                }
              : null,
            error: null
          });
        }
      };

      return query;
    }
  };

  return { db, calls };
}

async function run() {
  const concept = {
    concept: {
      category: "sofas",
      name: "Test Sofa"
    }
  };

  const owner = mockDb("OWNER");

  const saved = await saveConcept({
    db: owner.db,
    userId: "user-1",
    businessId: "business-1",
    concept
  });

  assert.equal(saved.success, true);

  const inserted = owner.calls.find(
    call => call.method === "insert"
  );

  assert.equal(inserted.value.business_id, "business-1");
  assert.equal(inserted.value.created_by, "user-1");

  const outsider = mockDb(null);

  const denied = await saveConcept({
    db: outsider.db,
    userId: "user-1",
    businessId: "business-1",
    concept
  });

  assert.equal(denied.success, false);
  assert.equal(
    outsider.calls.some(call => call.method === "insert"),
    false
  );

  const viewer = mockDb("VIEWER");

  const viewerDenied = await saveConcept({
    db: viewer.db,
    userId: "user-1",
    businessId: "business-1",
    concept
  });

  assert.equal(viewerDenied.success, false);

  const list = mockDb("OWNER");

  const result = await listConcepts({
    db: list.db,
    userId: "user-1",
    businessId: "business-1"
  });

  assert.equal(result.success, true);

  assert.equal(
    list.calls.some(call =>
      call.method === "eq" &&
      call.column === "business_id" &&
      call.value === "business-1"
    ),
    true
  );

  console.log("✅ PRODUCT LIBRARY SECURITY TEST PASSED");
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
