function createFactoryPack(model = {}) {

  if (model.status !== "APPROVED") {
    return {
      success: false,
      reason: "MODEL_NOT_APPROVED",
      message: "Factory Pack can only be created after owner approval."
    };
  }

  const {
    modelName = "Unnamed Model",
    category = "sofa",
    dimensions = {},
    materials = {},
    modules = []
  } = model;

  return {
    success: true,

    factory_pack: {
      model: {
        name: modelName,
        category,
        revision: "V1",
        status: "PROTOTYPE"
      },

      overall_dimensions: {
        width_cm: dimensions.width_cm || null,
        depth_cm: dimensions.depth_cm || null,
        total_height_cm: dimensions.total_height_cm || null,
        seat_height_cm: dimensions.seat_height_cm || null,
        seat_depth_cm: dimensions.seat_depth_cm || null,
        arm_height_cm: dimensions.arm_height_cm || null
      },

      frame: {
        construction: materials.frame || "TO_BE_DEFINED",
        reinforcement: "ENGINEERING_REVIEW_REQUIRED",
        drawing_required: true
      },

      foam: {
        seat: materials.seatFoam || "TO_BE_DEFINED",
        back: materials.backFoam || "TO_BE_DEFINED",
        layer_plan_required: true
      },

      upholstery: {
        fabric: materials.fabric || "TO_BE_DEFINED",
        fabric_quantity_meters: null,
        cutting_pattern_required: true,
        sewing_pattern_required: true
      },

      modules: modules.map((module, index) => ({
        module_number: index + 1,
        name: module.name || `Module ${index + 1}`,
        width_cm: module.width_cm || null,
        depth_cm: module.depth_cm || null,
        height_cm: module.height_cm || null,
        frame_template_required: true,
        foam_template_required: true,
        upholstery_template_required: true
      })),

      templates: {
        frame_parts: [],
        foam_parts: [],
        upholstery_parts: [],
        sewing_parts: []
      },

      drawings: {
        front_view: true,
        side_view: true,
        top_view: true,
        exploded_view: true,
        section_views: true,
        dimensioned_drawings: true
      },

      production: {
        prototype_required: true,
        factory_measurement_verification_required: true,
        physical_fit_test_required: true,
        final_template_release_after_prototype: true
      },

      approval: {
        owner_approved: true,
        engineering_approved: false,
        factory_approved: false,
        ready_for_mass_production: false
      }
    },

    generated_at: new Date().toISOString()
  };
}

module.exports = {
  createFactoryPack
};
