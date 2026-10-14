"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {createLaunchHandoff,compareApprovedRevision}=require("./product-launch-bridge");
const base=()=>({id:"sofa-001",business_id:"casa-verona",development_status:"APPROVED_FOR_MARKETING",model_name:"Nova",approved_spec:{fabric:"Boucle",width_cm:280},approved_assets:[]});
test("approved product produces a draft, not a published ad",()=>{
 const handoff=createLaunchHandoff(base(),{approvalId:"approval-001",dailyBudgetIls:100});
 assert.equal(handoff.workflow.owner_approval_required,true);
 assert.equal(handoff.workflow.campaign_published,false);
 assert.equal(handoff.publication_blocked,true);
 assert.equal(handoff.creative.ai_generated,false);
 assert.equal(compareApprovedRevision(handoff,base(),"approval-001").current,true);
});
test("unapproved product cannot launch",()=>{
 const m=base();m.development_status="FACTORY_APPROVED";
 assert.throws(()=>createLaunchHandoff(m,{approvalId:"approval-001",dailyBudgetIls:100}),/not approved/);
});
test("rejects cross-business product",()=>{
 const m=base();m.business_id="another-brand";
 assert.throws(()=>createLaunchHandoff(m,{approvalId:"approval-001",dailyBudgetIls:100}),/Business mismatch/);
});
test("material changes flag old creative for review",()=>{
 const h=createLaunchHandoff(base(),{approvalId:"approval-001",dailyBudgetIls:100});
 const changed=base();changed.approved_spec.fabric="Velvet";
 const status=compareApprovedRevision(h,changed,"approval-001");
 assert.equal(status.requires_creative_review,true);
 assert.equal(status.publication_blocked,true);
});
test("budget is required and validated",()=>{
 assert.throws(()=>createLaunchHandoff(base(),{approvalId:"approval-001"}),/budget/i);
});
