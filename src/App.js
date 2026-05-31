import { useState, useEffect, useRef, useCallback, useMemo } from "react";

const DEMO_INCOMING = [
  { ch:'wa', from:'The Vineyard Hotel', area:'Bellville', time:'06:42', av:'🧔',
    raw:'Hi please 50kg tomatoes 30kg onions 2 bags potatoes deliver bellville tomorrow dankie',
    items:[{n:'Tomatoes',q:'50kg'},{n:'Onions',q:'30kg'},{n:'Potatoes',q:'2 bags'}], delay:700 },
  { ch:'em', from:'Southern Sun Hotel', area:'Cape Town CBD', time:'07:31', av:'🏨',
    sub:'SAP Purchase Order 28.04.2026', po:'4500098234',
    raw:'Butternut 10kg, Cucumber 5kg, Red Onion 10kg, Potato Large 40kg, Tomato 15kg, Lemon 10kg, Pineapple 10kg',
    items:[{n:'Butternut',q:'10kg'},{n:'Cucumber',q:'5kg'},{n:'Red Onion',q:'10kg'},{n:'Potato Large',q:'40kg'},{n:'Tomato',q:'15kg'},{n:'Lemon',q:'10kg'},{n:'Pineapple',q:'10kg'}],
    enquiry:'Bean Sprout Alfalfa — qty missing. Contact Igshaan Samuels.', delay:1400 },
  { ch:'wa', from:'Mama Africa Restaurant', area:'Cape Town CBD', time:'07:45', av:'🍽️',
    raw:'Sisi please 20kg aartappels spinach 10 bunches bananas 3 boxes dankie',
    items:[{n:'Potatoes',q:'20kg'},{n:'Spinach',q:'10 bunches'},{n:'Bananas',q:'3 boxes'}], delay:1200 },
  { ch:'em', from:'Baia Seafood Restaurant', area:'V&A Waterfront', time:'08:15', av:'🦞',
    sub:'for delivery 27/04/2026',
    raw:'Baby Gem Squash x3 pun, Jalapeño 100g, Mange Tout 2kg, Pattipans 4 pun, Sugar Snaps 2kg, Tenderstem Broccoli 1 pkt, Strawberries 4 pun, Cucumber 8 ea.',
    items:[{n:'Baby Gem Squash',q:'3 pun'},{n:'Jalapeño',q:'100g'},{n:'Mange Tout',q:'2kg'},{n:'Pattipans',q:'4 pun'},{n:'Sugar Snaps',q:'2kg'},{n:'Tenderstem Broccoli',q:'1 pkt'},{n:'Strawberries',q:'4 pun'},{n:'Cucumber',q:'8 units'}], delay:1200 },
  { ch:'wa', from:'Spice Route Catering', area:'Woodstock', time:'08:30', av:'🧑🏿',
    raw:'Sawubona please 30kg mealies 20kg onions 10kg tomatoes for tomorrow morning',
    items:[{n:'Mealies',q:'30kg'},{n:'Onions',q:'20kg'},{n:'Tomatoes',q:'10kg'}], delay:1100 },
  { ch:'em', from:'Radisson Blu Hotel', area:'Cape Town CBD', time:'09:10', av:'🏩',
    sub:'PO GR0000007043 — Delivery 28 April', po:'GR0000007043',
    raw:'Watermelon 50kg, Pineapple 48kg, Banana 30kg, Apples Red 20kg, Broccoli 10kg, Button Mushrooms 5kg',
    items:[{n:'Watermelon',q:'50kg'},{n:'Pineapple',q:'48kg'},{n:'Banana',q:'30kg'},{n:'Apples Red',q:'20kg'},{n:'Broccoli',q:'10kg'},{n:'Button Mushrooms',q:'5kg'}], delay:1200 },
  { ch:'wa', from:'La Colombe Restaurant', area:'Constantia', time:'09:25', av:'🧔🏽',
    raw:'hi same order as last tuesday please and add 2 boxes apples',
    items:[{n:'Tomatoes',q:'30kg'},{n:'Onions',q:'20kg'},{n:'Potatoes',q:'15kg'},{n:'Apples',q:'2 boxes'}], delay:1100 },
  { ch:'ph', from:'Cape Grace Hotel', area:'V&A Waterfront', time:'09:40', av:'🎩',
    raw:'Phone order: 25kg baby potatoes, 15kg cherry tomatoes, 10kg mixed peppers, 8kg garlic',
    items:[{n:'Baby Potatoes',q:'25kg'},{n:'Cherry Tomatoes',q:'15kg'},{n:'Mixed Peppers',q:'10kg'},{n:'Garlic',q:'8kg'}], delay:1200 },
];

const DEFAULT_SETTINGS = {
  companyName:'Green Scene Fresh Wholesalers', companyEmoji:'🥦',
  address:'Unit 4, 348 Voortrekker Road, Maitland, Cape Town',
  phone:'082 773 4141', whatsapp:'+27 82 773 4141', email:'orders@greenscene.co.za',
  orderPrefix:'CFV', orderStartFrom:1, deliveryDefault:'today', orderCutoffHour:13,
  vehicles:[{name:'Van 1',driver:'Sipho',reg:'CA 123-456'},{name:'Van 2',driver:'Mohammed',reg:'CA 789-012'},{name:'Van 3',driver:'Pieter',reg:'CA 345-678'}]
};

const mkNum = (p,n) => `${p}-${String(n).padStart(4,'0')}`;
const nowTime = () => new Date().toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'});
const nowDate = () => new Date().toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const todayStr = () => new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'});

function buildPickSheet(orders) {
  const map = {};
  orders.forEach(o => {
    o.items.forEach(it => {
      const k = it.n.toLowerCase().trim();
      if(!map[k]) map[k]={name:it.n,total:0,unit:'',customers:[]};
      map[k].total += parseFloat(it.q)||1;
      map[k].unit = it.q.replace(/[\d.]/g,'').trim();
      map[k].customers.push({from:o.from,qty:it.q});
    });
  });
  return Object.values(map).sort((a,b)=>a.name.localeCompare(b.name));
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Georgia,sans-serif;background:#0a1a0a;min-height:100vh;display:flex;flex-direction:column;align-items:stretch;padding:0 0 60px 0;margin:0}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes splashPulse{0%{box-shadow:0 0 0 0 rgba(74,222,128,0.6)}60%{box-shadow:0 0 0 18px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
@keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

.page-header{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:#0d1f0d;border-bottom:1px solid #1a3a1a}
.page-header h1{color:#4ade80;font-size:24px;font-weight:700;margin:0}
.page-header p{color:#6b9a6b;font-size:13px;margin:0}
.demo-controls{display:flex;gap:8px;padding:8px 16px;background:#0d1f0d;border-bottom:1px solid #1a3a1a}
.demo-btn{background:#1a5c1a;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit}
.demo-btn:hover{background:#166016}
.demo-btn.sec{background:transparent;border:1px solid #2a5c2a;color:#4ade80}

.phone-wrap{position:relative;flex:1;display:flex;flex-direction:column}
.phone-frame{flex:1;display:flex;flex-direction:column;background:#fff}
.phone-screen{background:#f4f6f8;border-radius:0;overflow:hidden;flex:1;display:flex;flex-direction:column;position:relative;min-height:calc(100vh - 120px)}

.app-header{background:#1a5c1a;padding:8px 14px 10px;flex-shrink:0}
.app-title{color:#fff;font-size:30px;font-weight:700;display:flex;align-items:center;justify-content:space-between;gap:8px}
.ldot{width:6px;height:6px;background:#4ade80;border-radius:50%;animation:pulse 1.5s infinite;display:inline-block;margin-left:6px}
.clock-el{font-size:13px;font-weight:600;color:rgba(255,255,255,0.75)}
.settings-btn{background:rgba(255,255,255,0.2);border:1.5px solid rgba(255,255,255,0.5);border-radius:8px;padding:5px 10px;cursor:pointer;color:#fff;font-size:12px;font-family:inherit}

.stats-row{background:#fff;display:flex;justify-content:center;align-items:stretch;border-bottom:1px solid #e5e7eb;flex-shrink:0}
.live-pill{display:flex;align-items:center;gap:6px;background:#0d1f0d;border-right:1px solid #1a3a1a;padding:6px 14px 6px 12px;flex-shrink:0}
.live-pill-dot{width:7px;height:7px;background:#4ade80;border-radius:50%;animation:pulse 1.5s infinite;flex-shrink:0}
.live-pill-text{font-size:11px;font-weight:800;color:#4ade80;letter-spacing:1.5px;text-transform:uppercase}
.sc{padding:6px 18px;text-align:center;border-right:1px solid #f3f4f6;display:flex;flex-direction:column;align-items:center;justify-content:center}
.sc:last-child{border-right:none}
.sn{font-size:20px;font-weight:800;line-height:1.1}
.sl{font-size:11px;font-weight:700;color:#6b7280;letter-spacing:0.5px;margin-top:1px}

.ch-pills{background:#fff;display:flex;gap:6px;padding:6px 10px;border-bottom:1px solid #e5e7eb;flex-shrink:0;justify-content:center;flex-wrap:wrap}
.ch-pill{display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all 0.15s}
.ch-pill.all-orders{background:#f0fdf4;color:#1a5c1a;border:2px solid #1a5c1a;font-weight:800}
.ch-pill.all-orders.active{background:#1a5c1a;color:#fff}
.ch-pill.wa{background:#dcfce7;color:#16a34a}
.ch-pill.wa.active{background:#16a34a;color:#fff}
.ch-pill.em{background:#dbeafe;color:#2563eb}
.ch-pill.em.active{background:#2563eb;color:#fff}
.ch-pill.ph{background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe}
.ch-pill.ph.active{background:#7c3aed;color:#fff;border-color:#7c3aed}
.ch-pill.unpicked{background:#fef2f2;color:#ef4444;border:1px solid #fecaca}
.ch-pill.unpicked.active{background:#ef4444;color:#fff}

.tab-bar{background:#fff;display:flex;border-bottom:2px solid #e5e7eb;flex-shrink:0;flex-wrap:wrap;justify-content:center;align-items:center;padding:4px 8px;box-sizing:border-box}
.tab-bar::-webkit-scrollbar{display:none}
.tb{flex-shrink:0;padding:6px 10px;font-size:11px;font-weight:600;color:#374151;border:1.5px solid #d1d5db;background:#f9fafb;border-radius:8px;margin:2px 2px;cursor:pointer;white-space:nowrap;font-family:inherit;transition:all 0.15s}
.tb:hover{background:#f3f4f6;border-color:#9ca3af}
.tb.active{color:#fff;background:#1a5c1a;border-color:#1a5c1a;font-weight:700}
.tb.accent{background:#f0fdf4;color:#1d4ed8;border-color:#bbf7d0}

.screen-content{flex:1;overflow-y:auto;background:#f4f6f8}
.screen-content::-webkit-scrollbar{display:none}

.oc{background:#fff;border-radius:10px;margin-bottom:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);animation:fadeUp 0.4s ease;cursor:pointer;transition:box-shadow 0.15s,transform 0.1s;border:1.2px solid #dc2626}
.oc:active{transform:scale(0.99)}
.oc.wa{border-left:4px solid #25D366}
.oc.em{border-left:4px solid #2563eb}
.oc.ph{border-left:4px solid #7c3aed}
.ot{padding:8px 10px 4px;display:flex;justify-content:space-between;align-items:flex-start}
.ofrom{font-size:15px;font-weight:700;color:#111;display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.oname-text{color:#5b21b6;background:#ede9fe;border-radius:6px;padding:2px 8px;font-size:14px}
.ometa{font-size:13px;color:#6b7280;margin-top:2px}
.oright{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.ts-badge{background:#e6f1fb;color:#185fa5;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;white-space:nowrap}
.tap-hint{font-size:13px;color:#9ca3af}
.oraw{padding:2px 10px 5px;font-size:13px;color:#9ca3af;font-style:italic;line-height:1.4}
.oitems{padding:0 10px 6px;display:flex;flex-wrap:wrap;gap:3px}
.chip{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:2px 6px;font-size:12px;color:#166534}
.chip.more{background:#f3f4f6;border:none;color:#6b7280}
.enq{background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:4px 8px;margin:0 10px 6px;font-size:12px;color:#92400e;display:flex;align-items:center;justify-content:space-between;gap:4px}
.ofooter{background:#f9fafb;padding:5px 8px;display:flex;align-items:center;border-top:1px solid #f3f4f6;gap:4px}
.ofooter-left{flex:1;display:flex;align-items:center}
.ofooter-center{flex:1;display:flex;align-items:center;justify-content:center}
.ofooter-right{flex:1;display:flex;align-items:center;justify-content:flex-end;gap:4px}
.wabadge{background:#dcfce7;color:#16a34a;font-size:12px;font-weight:700;padding:2px 6px;border-radius:8px}
.embadge{background:#dbeafe;color:#2563eb;font-size:12px;font-weight:700;padding:2px 6px;border-radius:8px}
.phbadge{background:#f5f3ff;color:#7c3aed;font-size:12px;font-weight:700;padding:2px 6px;border-radius:8px}
.deliv-badge{display:inline-flex;align-items:center;gap:4px;background:#E6F1FB;border-radius:6px;padding:2px 8px;font-size:11px;color:#185FA5;cursor:pointer}

.split-view{display:flex;gap:6px;padding:10px}
.inbox-col{flex:1;display:flex;flex-direction:column;min-width:0}
.inbox-hdr{border-radius:8px 8px 0 0;padding:6px 8px;display:flex;justify-content:space-between;align-items:center}
.inbox-hdr.wa{background:#25D366}
.inbox-hdr.em{background:#2563eb}
.inbox-hdr.ph{background:#7c3aed}
.inbox-hdr-title{color:#fff;font-size:14px;font-weight:700}
.inbox-hdr-ct{color:rgba(255,255,255,0.9);font-size:13px;font-weight:700;background:rgba(255,255,255,0.2);border-radius:8px;padding:1px 6px}
.inbox-body{background:#fff;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;overflow-y:auto;padding:6px;display:flex;flex-direction:column;gap:5px;min-height:200px;max-height:460px}
.inbox-body::-webkit-scrollbar{display:none}
.inbox-empty{text-align:center;padding:20px 8px;color:#d1d5db;font-size:13px}
.imsg{background:#f9fafb;border:1px solid #f3f4f6;border-radius:6px;padding:6px 8px;animation:fadeUp 0.3s ease;font-size:12px}
.imsg.processing{border-color:#fde68a}
.imsg.done{border-color:#bbf7d0;background:#f0fdf4}
.imsg-from{font-weight:700;color:#111;font-size:13px;margin-bottom:2px}
.imsg-raw{color:#6b7280;font-style:italic;line-height:1.4;font-size:11px}
.rdot{width:5px;height:5px;border-radius:50%;background:#fbbf24;animation:pulse 1s infinite;display:inline-block;margin-right:3px}
.rtext{font-size:11px;color:#d97706;font-weight:600}
.ichip{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:1px 5px;font-size:11px;color:#166534}

.bi{background:#fff;border-radius:8px;margin-bottom:6px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
.bi-top{padding:8px 10px;display:flex;justify-content:space-between;align-items:center}
.bi-name{font-size:14px;font-weight:700}
.bi-total{font-size:14px;font-weight:700;color:#1a5c1a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:2px 8px}
.bi-custs{padding:0 10px 8px;display:flex;flex-wrap:wrap;gap:3px}
.bchip{font-size:12px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:8px;padding:2px 6px;color:#374151}

.vc{background:#fff;border-radius:10px;margin-bottom:8px;padding:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05)}
.vn{font-size:14px;font-weight:700;margin-bottom:6px;color:#111;display:flex;justify-content:space-between;align-items:center}
.vr{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;border-bottom:1px solid #f9fafb}

.toast-container{position:fixed;bottom:28px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.toast-msg{background:#1a1a1a;color:#fff;font-size:14px;font-weight:600;padding:12px 18px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.25);display:flex;align-items:center;gap:10px;max-width:320px;animation:toastIn 0.25s ease;border-left:4px solid #4ade80;pointer-events:auto}
.toast-msg.warn{border-left-color:#f59e0b}
.toast-msg.err{border-left-color:#ef4444}

.overlay-bg{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:250;display:flex;align-items:center;justify-content:center;padding:16px}
.detail-sheet{background:#fff;border-radius:16px;width:min(96vw,680px);max-height:92vh;overflow:hidden;display:flex;flex-direction:column;animation:slideUp 0.3s ease}
.detail-hdr{padding:12px 20px;display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;border-bottom:1px solid #f3f4f6}
.detail-body{flex:1;overflow-y:auto;padding:14px 20px}
.detail-foot{padding:10px 20px 16px;border-top:1px solid #f3f4f6;flex-shrink:0;display:flex;gap:8px}
.close-btn{background:#f3f4f6;border:none;border-radius:6px;padding:4px 12px;font-size:13px;cursor:pointer;color:#6b7280;font-family:inherit}
.action-btn{flex:1;padding:10px;border-radius:8px;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}

.settings-sheet{background:#fff;border-radius:14px;width:95vw;max-width:640px;max-height:92vh;overflow-y:auto;display:flex;flex-direction:column}
.settings-hdr{background:#1a5c1a;padding:12px 16px;border-radius:14px 14px 0 0;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:1}
.s-input{flex:1;font-size:12px;padding:6px 8px;border:1px solid #e5e7eb;border-radius:8px;outline:none;font-family:inherit}
.s-label{font-size:12px;color:#6b7280;width:120px;flex-shrink:0}

.phone-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:500;display:flex;align-items:flex-end;justify-content:center}
.phone-modal{background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:560px;padding:20px 18px 32px;animation:slideUp 0.3s ease}

.home-bar{background:#fff;display:flex;justify-content:center;padding:6px 0 4px;flex-shrink:0}
.home-ind{width:120px;height:4px;background:#e5e7eb;border-radius:2px}
.powered-bar{background:#0d1f0d;text-align:center;padding:4px 0 3px;font-size:9px;font-weight:800;color:#4ade80;letter-spacing:1.5px;flex-shrink:0}

.splash{position:fixed;inset:0;background:#0a1a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;z-index:9999;padding-bottom:60px}
.splash-lang-bar{position:absolute;top:0;left:0;right:0;background:#0a2d0a;border-bottom:1px solid rgba(74,222,128,0.3);padding:9px 20px;text-align:center}
.splash-bottom-bar{position:absolute;bottom:0;left:0;right:0;background:rgba(13,31,13,0.97);border-top:1px solid rgba(37,211,102,0.35);padding:8px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.splash-logo{background:#4ade80;border-radius:16px;padding:12px 28px;text-align:center;margin-bottom:28px}
.splash-logo-text{font-size:52px;font-weight:900;color:#0d1f0d;line-height:1;letter-spacing:-2px}
.splash-logo-sub{font-size:11px;color:#fff;letter-spacing:2px;margin-top:-4px}
.splash-tag{color:#4ade80;font-size:20px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;text-align:center;margin-bottom:12px}
.splash-headline{color:#fff;font-size:clamp(22px,5vw,32px);font-weight:800;text-align:center;line-height:1.2;margin-bottom:8px;padding:0 24px}
.splash-sub{color:rgba(255,255,255,0.55);font-size:14px;text-align:center;margin-bottom:36px;padding:0 32px;line-height:1.5}
.splash-bullets{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:36px;padding:0 24px}
.splash-bullet{background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.25);color:#4ade80;font-size:12px;font-weight:700;border-radius:20px;padding:5px 12px}
.splash-cta{background:#4ade80;color:#0a1a0a;font-size:18px;font-weight:900;border:none;border-radius:50px;padding:16px 40px;cursor:pointer;font-family:inherit;letter-spacing:0.5px;animation:splashPulse 1.8s infinite}
.splash-hint{color:rgba(255,255,255,0.3);font-size:12px;margin-top:20px;letter-spacing:0.5px}
.empty-state{text-align:center;padding:40px 16px;color:#9ca3af;font-size:14px}
.empty-icon{font-size:36px;margin-bottom:12px}
.add-driver-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;border:1.5px dashed #1a5c1a;border-radius:8px;background:#f0fdf4;color:#1a5c1a;font-size:12px;font-weight:600;cursor:pointer;margin-top:10px;font-family:inherit;width:100%;box-sizing:border-box}
.feat-card{background:#fff;border-radius:10px;margin-bottom:8px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;gap:12px;align-items:flex-start}
`;

function SplashScreen({ onLaunch }) {
  return (
    <div className="splash" onClick={onLaunch}>
      <div className="splash-lang-bar">
        <div style={{fontSize:'11px',fontWeight:800,color:'#4ade80',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:4}}>🌍 Multilingual Order Intelligence</div>
        <div style={{fontSize:'13px',fontWeight:700,color:'#86efac',lineHeight:1.6}}>
          English · Afrikaans · Zulu · Xhosa · Sotho · Tswana · Venda · Tsonga · Swati · Ndebele · Shona · Portuguese<br/>
          <span style={{fontSize:'12px',color:'#4ade80'}}>— all orders always displayed in English on your dashboard</span>
        </div>
      </div>
      <div className="splash-logo">
        <div className="splash-logo-text">Inorder</div>
        <div className="splash-logo-sub">ORDER MANAGEMENT SYSTEM</div>
      </div>
      <div className="splash-tag">Inorder Live Demo</div>
      <div className="splash-headline">See how Inorder handles a full morning of orders — in 60 seconds</div>
      <div className="splash-sub">WhatsApp &amp; email orders arrive, get processed, picked and dispatched — automatically.</div>
      <div className="splash-bullets">
        {['💬 WhatsApp orders','📧 Email orders','📞 Phone orders','📃 Auto pick sheet','🚛 Van routes','🖨️ Print ready'].map(b=>(
          <span key={b} className="splash-bullet">{b}</span>
        ))}
      </div>
      <button className="splash-cta">▶ Tap to See It Live</button>
      <div className="splash-hint">Tap anywhere to start</div>
      <div className="splash-bottom-bar" onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',alignItems:'center',gap:10,flex:1}}>
          <span style={{fontSize:18}}>💬</span>
          <div>
            <span style={{color:'#4ade80',fontSize:13,fontWeight:800}}>First month FREE</span>
            <span style={{color:'rgba(255,255,255,0.5)',fontSize:12,margin:'0 8px'}}>·</span>
            <span style={{color:'rgba(255,255,255,0.65)',fontSize:12}}>info@inorder.co.za · marc@inorder.co.za</span>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:11,marginLeft:8}}>v2.0</span>
          </div>
        </div>
        <a href="https://wa.me/27827734141" target="_blank" rel="noopener noreferrer"
          style={{background:'#25D366',color:'#fff',fontSize:13,fontWeight:800,borderRadius:20,padding:'7px 16px',textDecoration:'none',whiteSpace:'nowrap',flexShrink:0}}>
          WhatsApp Marc
        </a>
      </div>
    </div>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t=>(
        <div key={t.id} className={`toast-msg${t.type==='warn'?' warn':t.type==='err'?' err':''}`}>{t.msg}</div>
      ))}
    </div>
  );
}

function OrderCard({ order, onSelect }) {
  const badge = order.ch==='wa' ? <span className="wabadge">💬 WhatsApp</span>
    : order.ch==='ph' ? <span className="phbadge">📞 Phone Order</span>
    : <span className="embadge">📧 Email</span>;
  const chColor = order.ch==='wa'?'#16a34a':order.ch==='em'?'#2563eb':'#7c3aed';
  return (
    <div className={`oc ${order.ch}`} onClick={()=>onSelect(order)}>
      <div className="ot">
        <div>
          <div className="ofrom">
            <span style={{marginRight:4}}>{order.av}</span>
            <span className="oname-text">{order.from}</span>
            {order.po && <span style={{fontSize:11,fontWeight:700,color:'#0c447c',background:'#e6f1fb',border:'0.5px solid #b5d4f4',borderRadius:6,padding:'1px 7px',fontFamily:'monospace',whiteSpace:'nowrap',marginLeft:4}}>{order.po}</span>}
          </div>
          <div className="ometa">📍 {order.area} · {order.orderNum}</div>
        </div>
        <div className="oright">
          <span className="ts-badge">{order.time}</span>
          <span className="tap-hint">👆 tap to open</span>
        </div>
      </div>
      {order.sub && <div className="oraw">📄 {order.sub}</div>}
      {order.enquiry && (
        <div className="enq">
          <span>⚠️ {order.enquiry}</span>
          <span style={{background:'#fee2e2',color:'#dc2626',fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:6,whiteSpace:'nowrap'}}>🔴 Unresolved</span>
        </div>
      )}
      <div className="oitems">
        {order.items.slice(0,4).map((it,i)=><span key={i} className="chip">{it.n} {it.q}</span>)}
        {order.items.length>4 && <span className="chip more">+{order.items.length-4} more items</span>}
      </div>
      <div className="ofooter">
        <div className="ofooter-left">{badge}</div>
        <div className="ofooter-center"><span className="deliv-badge">Delivery: {order.deliveryDate||todayStr()}</span></div>
        <div className="ofooter-right"><span style={{fontSize:13,fontWeight:700,color:chColor}}>{order.items.length} item{order.items.length!==1?'s':''}</span></div>
      </div>
    </div>
  );
}

function OrdersView({ orders, channelFilter, onSelect }) {
  const filtered = channelFilter==='all' ? orders
    : channelFilter==='unpicked' ? orders.filter(o=>!o.status||o.status==='needs_picking')
    : orders.filter(o=>o.ch===channelFilter);
  if(!filtered.length) return (
    <div style={{maxWidth:780,margin:'0 auto',padding:10}}>
      <div className="empty-state"><div className="empty-icon">📭</div>Run demo to see orders arrive</div>
    </div>
  );
  return (
    <div style={{maxWidth:780,margin:'0 auto',padding:10}}>
      {filtered.map(o=><OrderCard key={o.id} order={o} onSelect={onSelect}/>)}
    </div>
  );
}

function IncomingView({ inbox }) {
  return (
    <div className="split-view">
      {['wa','em','ph'].map(ch=>(
        <div key={ch} className="inbox-col">
          <div className={`inbox-hdr ${ch}`}>
            <span className="inbox-hdr-title">{ch==='wa'?'💬 WhatsApp':ch==='em'?'📧 Email':'📞 Phone'}</span>
            <span className="inbox-hdr-ct">{inbox[ch].length}</span>
          </div>
          <div className="inbox-body">
            {inbox[ch].length===0 && <div className="inbox-empty">{ch==='wa'?'WhatsApp orders appear here':ch==='em'?'Email orders appear here':'Phone orders appear here'}</div>}
            {inbox[ch].map(msg=>(
              <div key={msg.id} className={`imsg${msg.processing?' processing':msg.done?' done':''}`}>
                <div className="imsg-from">{msg.av} {msg.from}</div>
                <div className="imsg-raw">"{msg.raw.substring(0,80)}{msg.raw.length>80?'...':''}"</div>
                {msg.processing && <div style={{display:'flex',alignItems:'center',marginTop:4}}><span className="rdot"></span><span className="rtext">AI Reading order...</span></div>}
                {msg.done && <div style={{display:'flex',flexWrap:'wrap',gap:2,marginTop:4}}>{msg.items.slice(0,3).map((it,i)=><span key={i} className="ichip">{it.n}</span>)}{msg.items.length>3&&<span className="ichip">+{msg.items.length-3}</span>}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PickSheetView({ orders }) {
  const sheet = useMemo(()=>buildPickSheet(orders),[orders]);
  if(!sheet.length) return <div style={{maxWidth:'50%',margin:'0 auto',padding:10}}><div className="empty-state"><div className="empty-icon">📦</div>Run demo — buy list builds automatically</div></div>;
  return (
    <div style={{maxWidth:'50%',margin:'0 auto',padding:10}}>
      <div style={{background:'#1a5c1a',color:'#fff',borderRadius:8,padding:'8px 14px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontWeight:700,fontSize:14}}>📦 Pick Sheet — {nowDate()}</span>
        <span style={{fontSize:12,opacity:0.8}}>{sheet.length} lines · {orders.length} orders</span>
      </div>
      {sheet.map((item,i)=>(
        <div key={i} className="bi">
          <div className="bi-top"><span className="bi-name">{item.name}</span><span className="bi-total">{item.total}{item.unit}</span></div>
          <div className="bi-custs">{item.customers.map((c,j)=><span key={j} className="bchip">{c.from}: {c.qty}</span>)}</div>
        </div>
      ))}
    </div>
  );
}

function VansView({ orders, settings }) {
  if(!orders.length) return <div style={{maxWidth:900,margin:'0 auto',padding:10}}><div className="empty-state"><div className="empty-icon">🚛</div>Run demo — van lists appear automatically</div></div>;
  const byVan = {};
  orders.forEach(o=>{
    const v=o.vehicle||settings.vehicles[0]?.name||'Van 1';
    if(!byVan[v]) byVan[v]={vehicle:v,driver:o.driver||'',orders:[]};
    byVan[v].orders.push(o);
  });
  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:10}}>
      {Object.values(byVan).map((van,i)=>(
        <div key={i} className="vc">
          <div className="vn">
            <span>🚛 {van.vehicle} — {van.driver}</span>
            <span style={{fontSize:12,background:'#f0fdf4',color:'#1a5c1a',borderRadius:8,padding:'2px 8px',fontWeight:700}}>{van.orders.length} stops</span>
          </div>
          {van.orders.map((o,j)=>(
            <div key={j} className="vr">
              <span style={{color:'#374151',fontWeight:600}}>{o.av} {o.from}</span>
              <span style={{color:'#6b7280',fontSize:12}}>📍 {o.area} · {o.orderNum}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DeliveryView() {
  return (
    <div style={{padding:14,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{textAlign:'center',marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:800,color:'#1a5c1a',marginBottom:4}}>🚚 Delivery Notes</div>
        <div style={{fontSize:12,color:'#9ca3af'}}>Print professional delivery notes for your drivers</div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:10,width:'100%',maxWidth:480}}>
        <div style={{background:'#fff',border:'1.5px solid #ddd6fe',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#111'}}>1. Print by Route Summary</div>
            <div style={{fontSize:12,color:'#6b7280',marginTop:3}}>Customers grouped and printed by delivery zone.</div>
          </div>
          <button style={{flexShrink:0,background:'#7c3aed',color:'#fff',border:'none',borderRadius:8,padding:'10px 14px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🖨️ Print</button>
        </div>
        <div style={{background:'#fff',border:'1.5px solid #bbf7d0',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#111'}}>2. Print by Customer (Detailed)</div>
            <div style={{fontSize:12,color:'#6b7280',marginTop:3}}>One full delivery note per customer.</div>
          </div>
          <button style={{flexShrink:0,background:'#1a5c1a',color:'#fff',border:'none',borderRadius:8,padding:'10px 14px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>🖨️ Print</button>
        </div>
      </div>
    </div>
  );
}

function ReplenishView({ orders }) {
  const sheet = buildPickSheet(orders);
  if(!sheet.length) return <div style={{maxWidth:900,margin:'0 auto',padding:10}}><div className="empty-state"><div className="empty-icon">📦</div>Run demo first — replenishment guide builds automatically</div></div>;
  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:10}}>
      <div style={{background:'#1a5c1a',color:'#fff',borderRadius:8,padding:'8px 14px',marginBottom:10}}>
        <div style={{fontWeight:700,fontSize:14}}>📦 Stock Replenishment Guide — {nowDate()}</div>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',background:'#fff',borderRadius:8,overflow:'hidden',boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <thead>
          <tr style={{background:'#1a5c1a'}}>
            <th style={{padding:'8px 12px',textAlign:'left',fontSize:12,fontWeight:700,color:'#fff'}}>Item</th>
            <th style={{padding:'8px 12px',textAlign:'right',fontSize:12,fontWeight:700,color:'#fff'}}>Total Ordered</th>
            <th style={{padding:'8px 12px',textAlign:'center',fontSize:12,fontWeight:700,color:'#fff'}}>Supplied</th>
            <th style={{padding:'8px 12px',textAlign:'center',fontSize:12,fontWeight:700,color:'#fff'}}>Done ✓</th>
          </tr>
        </thead>
        <tbody>
          {sheet.map((item,i)=>(
            <tr key={i} style={{borderBottom:'1px solid #f3f4f6',background:i%2===0?'#fff':'#f9fafb'}}>
              <td style={{padding:'7px 12px',fontSize:13,fontWeight:600}}>{item.name}</td>
              <td style={{padding:'7px 12px',fontSize:13,fontWeight:700,color:'#166534',textAlign:'right'}}>{item.total}{item.unit}</td>
              <td style={{padding:'7px 12px',textAlign:'right'}}><span style={{display:'inline-block',width:70,height:20,border:'1.5px solid #aaa',borderRadius:4}}></span></td>
              <td style={{padding:'7px 12px',textAlign:'center'}}><span style={{display:'inline-block',width:18,height:18,border:'1.5px solid #1a5c1a',borderRadius:3}}></span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryView({ orders }) {
  if(!orders.length) return <div style={{maxWidth:900,margin:'0 auto',padding:10}}><div className="empty-state"><div className="empty-icon">📊</div>Run demo — day summary builds automatically</div></div>;
  const wa=orders.filter(o=>o.ch==='wa').length, em=orders.filter(o=>o.ch==='em').length, ph=orders.filter(o=>o.ch==='ph').length;
  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:10}}>
      <div style={{background:'#1a5c1a',borderRadius:12,padding:16,marginBottom:12,color:'#fff'}}>
        <div style={{fontSize:15,fontWeight:800}}>📊 Day Summary — {nowDate()}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:12}}>
          {[['Orders',orders.length,'#4ade80'],['WhatsApp',wa,'#86efac'],['Email',em,'#93c5fd'],['Phone',ph,'#c4b5fd']].map(([l,n,c])=>(
            <div key={l} style={{textAlign:'center',background:'rgba(255,255,255,0.1)',borderRadius:8,padding:'8px 4px'}}>
              <div style={{fontSize:22,fontWeight:900,color:c}}>{n}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:0.5,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      {orders.map(o=>(
        <div key={o.id} style={{background:'#fff',borderRadius:8,marginBottom:4,padding:'8px 12px',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:13,fontWeight:700}}>{o.av} {o.from}</div>
            <div style={{fontSize:11,color:'#9ca3af'}}>{o.orderNum} · {o.items.length} items · 📍 {o.area}</div>
          </div>
          <span style={{fontSize:11,fontWeight:700,color:'#185fa5',background:'#e6f1fb',borderRadius:20,padding:'2px 8px'}}>{o.time}</span>
        </div>
      ))}
    </div>
  );
}



function FeaturesView() {
  const feats = [
    {e:'💬',t:'WhatsApp Orders',b:'Customers order via WhatsApp in any language. Orders appear instantly in English.'},
    {e:'📧',t:'Email Orders',b:'SAP purchase orders, plain text, any format — Inorder reads them all automatically.'},
    {e:'📞',t:'Voice Orders',b:'Voice notes transcribed in seconds. Any accent, any language.'},
    {e:'📃',t:'Auto Pick Sheet',b:'Pick sheet builds itself as orders arrive. Quantities consolidated per item.'},
    {e:'🚛',t:'Van & Route Management',b:'Orders automatically allocated to vehicles. Drivers see their own stops.'},
    {e:'🖨️',t:'Print & Documents',b:'One-tap delivery notes, picking lists, day summaries — print-ready.'},
    {e:'🧾',t:'Invoicing — Coming Soon',b:'Auto-generate invoices. Direct export to Sage, Xero, QuickBooks.'},
    {e:'🌍',t:'Multilingual',b:'Afrikaans, Zulu, Xhosa, Sotho, Tswana, Portuguese — all displayed in English.'},
  ];
  return (
    <div style={{padding:12}}>
      <div style={{background:'#0d1f0d',borderRadius:14,padding:16,marginBottom:14,textAlign:'center'}}>
        <div style={{fontSize:28,fontWeight:900,color:'#4ade80'}}>⚡ Inorder</div>
        <div style={{fontSize:13,color:'rgba(255,255,255,0.6)',marginTop:4,letterSpacing:1,textTransform:'uppercase'}}>Order Management System</div>
        <div style={{fontSize:14,color:'rgba(255,255,255,0.8)',marginTop:10,lineHeight:1.5}}>Built for fresh produce wholesalers.<br/>Less admin. Fewer mistakes. Faster deliveries.</div>
      </div>
      {feats.map((f,i)=>(
        <div key={i} className="feat-card">
          <span style={{fontSize:22,flexShrink:0}}>{f.e}</span>
          <div><div style={{fontSize:14,fontWeight:700,marginBottom:3}}>{f.t}</div><div style={{fontSize:12,color:'#6b7280',lineHeight:1.5}}>{f.b}</div></div>
        </div>
      ))}
      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:14,marginTop:4,textAlign:'center'}}>
        <div style={{fontSize:14,fontWeight:700,color:'#1a5c1a'}}>Free for your first month</div>
        <div style={{fontSize:13,color:'#6b7280',marginTop:4}}>Then R1,400/month flat — no per-user fees, no contracts</div>
        <div style={{marginTop:12}}><a href="https://wa.me/27827734141" style={{display:'inline-block',background:'#16a34a',color:'#fff',fontSize:14,fontWeight:800,padding:'11px 28px',borderRadius:50,textDecoration:'none'}}>💬 WhatsApp Marc</a></div>
      </div>
    </div>
  );
}

function OrderDetailOverlay({ order, onClose, onStatusChange }) {
  return (
    <div className="overlay-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="detail-sheet">
        <div className="detail-hdr">
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'#111'}}>{order.av} {order.from}</div>
            <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{order.orderNum} · 📍 {order.area}{order.po&&<> · <span style={{fontFamily:'monospace',color:'#0c447c',fontWeight:700}}>PO: {order.po}</span></>}</div>
          </div>
          <button className="close-btn" onClick={onClose}>✕ Close</button>
        </div>
        <div className="detail-body">
          {order.sub && <div style={{background:'#f9fafb',borderRadius:8,padding:'6px 10px',marginBottom:10,fontSize:12,color:'#374151'}}>📄 {order.sub}</div>}
          <div style={{background:'#f9fafb',borderRadius:8,padding:'8px 10px',marginBottom:10,fontSize:12,color:'#6b7280',fontStyle:'italic',lineHeight:1.5}}>"{order.raw}"</div>
          {order.enquiry && <div style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:6,padding:'6px 10px',marginBottom:10,fontSize:12,color:'#92400e'}}>⚠️ {order.enquiry}</div>}
          <div style={{fontSize:11,fontWeight:700,color:'#1a5c1a',letterSpacing:1,marginBottom:8,textTransform:'uppercase'}}>Order Items — {order.items.length} lines</div>
          {order.items.map((it,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #f3f4f6',fontSize:13}}>
              <span style={{color:'#111'}}>{it.n}</span>
              <span style={{fontWeight:700,color:'#1a5c1a'}}>{it.q}</span>
            </div>
          ))}
          <div style={{marginTop:14,background:'#f9fafb',borderRadius:8,padding:'8px 10px',fontSize:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#6b7280'}}>Delivery date</span><span style={{fontWeight:700,color:'#185fa5'}}>{order.deliveryDate||todayStr()}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{color:'#6b7280'}}>Vehicle</span><span style={{fontWeight:700}}>{order.vehicle}</span></div>
            <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#6b7280'}}>Driver</span><span style={{fontWeight:700}}>{order.driver}</span></div>
          </div>
        </div>
        <div className="detail-foot">
          <button className="action-btn" style={{background:'#fdf4ff',color:'#7c3aed'}} onClick={()=>onStatusChange('picked')}>📦 Mark Picked</button>
          <button className="action-btn" style={{background:'#dbeafe',color:'#2563eb'}} onClick={()=>onStatusChange('dispatched')}>🚛 Dispatched</button>
          <button className="action-btn" style={{background:'#1a5c1a',color:'#fff'}} onClick={onClose}>✓ Done</button>
        </div>
      </div>
    </div>
  );
}

function SettingsOverlay({ settings, onSave, onClose }) {
  const [form, setForm] = useState({...settings});
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setV = (i,k,v) => setForm(f=>({...f,vehicles:f.vehicles.map((vh,idx)=>idx===i?{...vh,[k]:v}:vh)}));
  const addV = () => setForm(f=>({...f,vehicles:[...f.vehicles,{name:`Van ${f.vehicles.length+1}`,driver:'',reg:''}]}));
  const remV = i => setForm(f=>({...f,vehicles:f.vehicles.filter((_,idx)=>idx!==i)}));
  const row = {display:'flex',alignItems:'center',gap:10,marginBottom:8};
  return (
    <div className="overlay-bg" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="settings-sheet">
        <div className="settings-hdr">
          <span style={{fontSize:14,fontWeight:500,color:'#fff'}}>⚙️ Inorder Settings</span>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.2)',border:'none',borderRadius:'50%',width:28,height:28,cursor:'pointer',color:'#fff',fontSize:16,lineHeight:1,fontFamily:'inherit'}}>✕</button>
        </div>
        <div style={{padding:16,display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Company Details</div>
            {[['Company name','companyName'],['Emoji','companyEmoji'],['Address','address'],['Phone','phone'],['WhatsApp','whatsapp'],['Email','email']].map(([l,k])=>(
              <div key={k} style={row}>
                <span className="s-label">{l}</span>
                <input value={form[k]||''} onChange={e=>set(k,e.target.value)} className="s-input" style={k==='companyEmoji'?{width:60,flex:'none',textAlign:'center'}:{}}/>
              </div>
            ))}
          </div>
          <div style={{borderTop:'1px solid #e5e7eb',paddingTop:14}}>
            <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Order Numbering</div>
            <div style={row}><span className="s-label">Prefix</span><input value={form.orderPrefix||''} onChange={e=>set('orderPrefix',e.target.value.toUpperCase())} maxLength={6} className="s-input" style={{width:80,flex:'none'}}/><span style={{fontSize:11,color:'#9ca3af'}}>e.g. CFV, MR</span></div>
            <div style={row}><span className="s-label">Start from</span><input type="number" value={form.orderStartFrom||1} onChange={e=>set('orderStartFrom',parseInt(e.target.value)||1)} className="s-input" style={{width:100,flex:'none'}}/></div>
          </div>
          <div style={{borderTop:'1px solid #e5e7eb',paddingTop:14}}>
            <div style={{fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Drivers &amp; Vehicles</div>
            {form.vehicles.map((v,i)=>(
              <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 28px',gap:6,marginBottom:8,alignItems:'center'}}>
                <input placeholder="Vehicle" value={v.name} onChange={e=>setV(i,'name',e.target.value)} style={{fontSize:12,padding:'5px 8px',border:'1px solid #e5e7eb',borderRadius:6,outline:'none'}}/>
                <input placeholder="Driver" value={v.driver} onChange={e=>setV(i,'driver',e.target.value)} style={{fontSize:12,padding:'5px 8px',border:'1px solid #e5e7eb',borderRadius:6,outline:'none'}}/>
                <input placeholder="Reg" value={v.reg} onChange={e=>setV(i,'reg',e.target.value)} style={{fontSize:12,padding:'5px 8px',border:'1px solid #e5e7eb',borderRadius:6,outline:'none'}}/>
                <button onClick={()=>remV(i)} style={{background:'none',border:'none',color:'#ef4444',fontSize:16,cursor:'pointer',padding:'0 4px'}}>✕</button>
              </div>
            ))}
            <button onClick={addV} className="add-driver-btn">+ Add Vehicle</button>
          </div>
          <div style={{borderTop:'1px solid #e5e7eb',paddingTop:14,display:'flex',gap:8}}>
            <button onClick={onClose} style={{flex:1,padding:10,borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',color:'#6b7280',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
            <button onClick={()=>{onSave(form);onClose();}} style={{flex:2,padding:10,borderRadius:8,border:'none',background:'#1a5c1a',color:'#fff',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>✅ Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhoneOrderModal({ onAdd, settings, onClose }) {
  const [from,setFrom]=useState('');
  const [area,setArea]=useState('');
  const [phone,setPhone]=useState('');
  const [note,setNote]=useState('');
  const [items,setItems]=useState([{n:'',q:''}]);
  const iStyle={width:'100%',fontSize:13,padding:'8px 10px',border:'1.5px solid #e5e7eb',borderRadius:8,outline:'none',fontFamily:'inherit'};
  const lStyle={fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:0.5,marginBottom:5};
  const addItem=()=>setItems(p=>[...p,{n:'',q:''}]);
  const setItem=(i,k,v)=>setItems(p=>p.map((it,idx)=>idx===i?{...it,[k]:v}:it));
  const remItem=i=>setItems(p=>p.filter((_,idx)=>idx!==i));
  const submit=()=>{
    if(!from.trim()) return;
    const valid=items.filter(it=>it.n.trim()&&it.q.trim());
    if(!valid.length) return;
    onAdd(from.trim(),area.trim()||'Phone / Walk-in',phone.trim(),note.trim(),valid);
    onClose();
  };
  return (
    <div className="phone-modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="phone-modal">
        <div style={{background:'#7c3aed',borderRadius:'12px 12px 0 0',padding:'10px 14px',margin:'-20px -18px 16px'}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:15}}>📞 New Phone / Walk-in Order</div>
          <div style={{color:'rgba(255,255,255,0.75)',fontSize:11,marginTop:2}}>Enter orders received by phone or in person</div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div><div style={lStyle}>Customer Name *</div><input value={from} onChange={e=>setFrom(e.target.value)} placeholder="Customer name" style={iStyle}/></div>
          <div><div style={lStyle}>Phone (optional)</div><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone number" style={iStyle}/></div>
          <div><div style={lStyle}>Area / Delivery Zone</div><input value={area} onChange={e=>setArea(e.target.value)} placeholder="Area / delivery zone" style={iStyle}/></div>
          <div><div style={lStyle}>Special Notes</div><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Special notes (optional)" style={iStyle}/></div>
          <div style={{fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:0.5,marginTop:4}}>Order Items</div>
          {items.map((it,i)=>(
            <div key={i} style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
              <input value={it.n} onChange={e=>setItem(i,'n',e.target.value)} placeholder="Item name" style={{flex:2,border:'1.5px solid #e5e7eb',borderRadius:8,padding:'7px 9px',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
              <input value={it.q} onChange={e=>setItem(i,'q',e.target.value)} placeholder="Qty" style={{width:60,flexShrink:0,border:'1.5px solid #e5e7eb',borderRadius:8,padding:'7px 8px',fontSize:13,fontFamily:'inherit',outline:'none',textAlign:'center'}}/>
              <div style={{display:'flex',gap:3,flexShrink:0}}>
                {['kg','each','punnet','bag'].map(u=>(
                  <button key={u} onClick={()=>setItem(i,'q',it.q+u)} style={{background:'#f3f4f6',color:'#6b7280',border:'1px solid #e5e7eb',borderRadius:6,padding:'4px 7px',fontSize:11,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>{u}</button>
                ))}
              </div>
              <button onClick={()=>remItem(i)} style={{background:'#fee2e2',color:'#dc2626',border:'none',borderRadius:8,padding:'7px 10px',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>✕</button>
            </div>
          ))}
          <button onClick={addItem} style={{width:'100%',background:'#f5f3ff',color:'#7c3aed',border:'1.5px solid #ddd6fe',borderRadius:8,padding:8,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>+ Add Item</button>
          <button onClick={submit} style={{width:'100%',background:'#7c3aed',color:'#fff',border:'none',borderRadius:10,padding:11,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:4}}>📞 Save Phone Order</button>
        </div>
      </div>
    </div>
  );
}

export default function InorderApp() {
  const [phase,setPhase]           = useState('splash');
  const [activeTab,setActiveTab]   = useState('orders');
  const [orders,setOrders]         = useState([]);
  const [inbox,setInbox]           = useState({wa:[],em:[],ph:[]});
  const [settings,setSettings]     = useState(DEFAULT_SETTINGS);
  const [showSettings,setShowSettings] = useState(false);
  const [selectedOrder,setSelectedOrder] = useState(null);
  const [channelFilter,setChannelFilter] = useState('all');
  const [demoRunning,setDemoRunning] = useState(false);
  const [clock,setClock]           = useState(nowTime());
  const [showPhoneOrder,setShowPhoneOrder] = useState(false);
  const [toasts,setToasts]         = useState([]);
  const demoTimers = useRef([]);
  const orderCounter = useRef(1);

  useEffect(()=>{const t=setInterval(()=>setClock(nowTime()),1000);return()=>clearInterval(t);},[]);

  const showToast = useCallback((msg,type='ok')=>{
    const id=Date.now()+Math.random();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200);
  },[]);

  const stats = useMemo(()=>({
    total:orders.length,
    wa:orders.filter(o=>o.ch==='wa').length,
    em:orders.filter(o=>o.ch==='em').length,
    ph:orders.filter(o=>o.ch==='ph').length,
    unpicked:orders.filter(o=>!o.status||o.status==='needs_picking').length,
  }),[orders]);

  const runDemo = useCallback(()=>{
    if(demoRunning) return;
    setDemoRunning(true);
    setOrders([]);
    setInbox({wa:[],em:[],ph:[]});
    orderCounter.current = settings.orderStartFrom||1;
    document.querySelector('.page-header').style.display='none';
    document.querySelector('.demo-controls').style.display='none';
    let cum=0;
    DEMO_INCOMING.forEach((raw,idx)=>{
      cum+=raw.delay;
      const t1=setTimeout(()=>{
        const vIdx=idx%settings.vehicles.length;
        const order={...raw,id:Date.now()+Math.random()+idx,orderNum:mkNum(settings.orderPrefix,orderCounter.current++),status:'needs_picking',receivedAt:new Date().toISOString(),deliveryDate:todayStr(),vehicle:settings.vehicles[vIdx]?.name||'Van 1',driver:settings.vehicles[vIdx]?.driver||'Driver'};
        setInbox(prev=>({...prev,[raw.ch]:[...prev[raw.ch],{...order,processing:true,done:false}]}));
        const t2=setTimeout(()=>{
          setInbox(prev=>({...prev,[raw.ch]:prev[raw.ch].map(o=>o.id===order.id?{...o,processing:false,done:true}:o)}));
          setOrders(prev=>[order,...prev]);
          showToast(`${raw.ch==='wa'?'💬':raw.ch==='em'?'📧':'📞'} ${order.from} — order received`);
          setActiveTab('orders');
        },1800);
        demoTimers.current.push(t2);
      },cum);
      demoTimers.current.push(t1);
    });
  },[demoRunning,settings,showToast]);

  const resetDemo = useCallback(()=>{
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current=[];
    setDemoRunning(false);
    setOrders([]);
    setInbox({wa:[],em:[],ph:[]});
    orderCounter.current=settings.orderStartFrom||1;
    try{document.querySelector('.page-header').style.display='flex';}catch(e){}
    try{document.querySelector('.demo-controls').style.display='flex';}catch(e){}
    showToast('↺ Demo reset — ready to run again','warn');
  },[settings,showToast]);

  const addPhoneOrder = useCallback((from,area,phone,note,items)=>{
    const order={id:Date.now(),ch:'ph',from,area,phone,time:nowTime(),raw:items.map(it=>`${it.n} ${it.q}`).join(', '),items,enquiry:note||null,av:'📞',orderNum:mkNum(settings.orderPrefix,orderCounter.current++),status:'needs_picking',receivedAt:new Date().toISOString(),deliveryDate:todayStr(),vehicle:settings.vehicles[0]?.name||'Van 1',driver:settings.vehicles[0]?.driver||'Driver'};
    setOrders(prev=>[order,...prev]);
    setActiveTab('orders');
    showToast(`📞 Phone order saved — ${from}`);
  },[settings,showToast]);

  const updateStatus = useCallback((orderId,status)=>{
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,status}:o));
    setSelectedOrder(prev=>prev&&prev.id===orderId?{...prev,status}:prev);
    showToast(`✅ ${status==='picked'?'Marked as picked':'Marked as dispatched'}`);
  },[showToast]);

  if(phase==='splash') return (
    <>
      <style>{CSS}</style>
      <SplashScreen onLaunch={()=>setPhase('demo')}/>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <Toasts toasts={toasts}/>

      <div className="page-header">
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
            <h1>{settings.companyEmoji} {settings.companyName}</h1>
          </div>
          <p>WhatsApp and Email orders arrive in real time — automatically captured, sorted and ready to action. <strong style={{color:'#4ade80'}}>This is your business on Inorder.</strong></p>
        </div>
      </div>

      <div className="demo-controls">
        {!demoRunning
          ? <button className="demo-btn" onClick={runDemo}>▶ Watch Orders Arrive</button>
          : <button className="demo-btn sec" onClick={resetDemo}>↺ Reset Demo</button>
        }
      </div>

      <div className="phone-wrap">
        <div className="phone-frame">
          <div className="phone-screen">

            <div className="app-header">
              <div className="app-title">
                <span>{settings.companyEmoji} {settings.companyName}<span className="ldot"></span></span>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span className="clock-el">{clock}</span>
                  <button className="settings-btn" onClick={()=>setShowSettings(true)}>⚙ Settings</button>
                </div>
              </div>
            </div>

            <div className="stats-row">
              <div className="live-pill">
                <div className="live-pill-dot"></div>
                <span className="live-pill-text">Live</span>
              </div>
              <div className="sc">
                <div className="sn" style={{color:'#1a5c1a'}}>{stats.total}</div>
                <div className="sl">ORDERS</div>
              </div>
            </div>

            <div className="ch-pills">
              <button className={`ch-pill wa${channelFilter==='wa'?' active':''}`} onClick={()=>setChannelFilter('wa')}>💬 WhatsApp {stats.wa}</button>
              <button className={`ch-pill em${channelFilter==='em'?' active':''}`} onClick={()=>setChannelFilter('em')}>📧 Email {stats.em}</button>
              <button className={`ch-pill ph${channelFilter==='ph'?' active':''}`} onClick={()=>{setChannelFilter('ph');setShowPhoneOrder(true);}}>📞 Phone {stats.ph}</button>
              <button className={`ch-pill unpicked${channelFilter==='unpicked'?' active':''}`} onClick={()=>setChannelFilter('unpicked')}>🔴 Unpicked {stats.unpicked}</button>
            </div>

            <div className="tab-bar">
              <div className={`ch-pill all-orders${activeTab==='orders'?' active':''}`} onClick={()=>setActiveTab('orders')} style={{margin:'3px 2px',alignSelf:'center',cursor:'pointer'}}>All Orders</div>
              <button className="tb" style={{background:'#fff',borderColor:'#1a5c1a',color:'#1a5c1a',fontWeight:700}} onClick={()=>{}}>🖨 Print all Unpicked Orders [{stats.unpicked}]</button>
              <button className={`tb${activeTab==='routes'?' active':''}`} onClick={()=>setActiveTab('routes')}>🚛 Routes</button>
              <button className={`tb${activeTab==='delivery'?' active':''}`} onClick={()=>setActiveTab('delivery')}>🚚 Delivery Notes</button>
              <button className={`tb${activeTab==='replenish'?' active':''}`} onClick={()=>setActiveTab('replenish')}>📦 Replenishment</button>
              <button className={`tb${activeTab==='summary'?' active':''}`} onClick={()=>setActiveTab('summary')}>📊 Day Summary</button>

            </div>

            <div className="screen-content">
              {activeTab==='orders'    && <OrdersView orders={orders} channelFilter={channelFilter} onSelect={setSelectedOrder}/>}
              {activeTab==='incoming'  && <IncomingView inbox={inbox}/>}
              {activeTab==='picksheet' && <PickSheetView orders={orders}/>}
              {activeTab==='routes'    && <VansView orders={orders} settings={settings}/>}
              {activeTab==='delivery'  && <DeliveryView/>}
              {activeTab==='replenish' && <ReplenishView orders={orders}/>}
              {activeTab==='summary'   && <SummaryView orders={orders}/>}

              {activeTab==='features'  && <FeaturesView/>}
            </div>

            <div className="home-bar"><div className="home-ind"></div></div>
            <div className="powered-bar">⚡ POWERED BY INORDER</div>
          </div>
        </div>
      </div>

      {showSettings   && <SettingsOverlay settings={settings} onSave={s=>{setSettings(s);showToast('✅ Settings saved');}} onClose={()=>setShowSettings(false)}/>}
      {selectedOrder  && <OrderDetailOverlay order={selectedOrder} onClose={()=>setSelectedOrder(null)} onStatusChange={status=>updateStatus(selectedOrder.id,status)}/>}
      {showPhoneOrder && <PhoneOrderModal onAdd={addPhoneOrder} settings={settings} onClose={()=>setShowPhoneOrder(false)}/>}
    </>
  );
}
