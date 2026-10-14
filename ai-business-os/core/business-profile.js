const BUSINESS_TYPES = {
  FURNITURE: "FURNITURE",
  FASHION: "FASHION",
  ECOMMERCE: "ECOMMERCE",
  OTHER: "OTHER"
};

function createBusinessProfile(input = {}) {
  const {
    businessId = "default",
    name = "My Business",
    type = BUSINESS_TYPES.OTHER,
    market = "Israel",
    positioning = "premium",
    goals = []
  } = input;

  const capabilities = {
    research: true,
    aiBusinessPartner: true,
    marketing: true,
    campaigns: true,
    content: true,
    productDevelopment: true,
    trendIntelligence: true,
    renderEngine: true
  };

  const verticalModules = {
    FURNITURE: {
      modelDeveloper: true,
      factoryPack: true,
      frameVisualizer: true,
      fashionDeveloper: false
    },

    FASHION: {
      modelDeveloper: false,
      factoryPack: false,
      frameVisualizer: false,
      fashionDeveloper: true
    },

    ECOMMERCE: {
      modelDeveloper: false,
      factoryPack: false,
      frameVisualizer: false,
      fashionDeveloper: false
    },

    OTHER: {}
  };

  return {
    business: {
      id: businessId,
      name,
      type,
      market,
      positioning,
      goals
    },

    capabilities,

    vertical:
      verticalModules[type] ||
      verticalModules.OTHER,

    architecture: {
      sharedCore: true,
      isolatedBusinessData: true,
      isolatedBrandDNA: true,
      isolatedResearchContext: true,
      isolatedProductLibrary: true
    },

    created_at:
      new Date().toISOString()
  };
}

module.exports = {
  BUSINESS_TYPES,
  createBusinessProfile
};
