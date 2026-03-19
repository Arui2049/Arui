import { NextResponse } from "next/server";
import { isValidShopDomain, generateWidgetToken } from "@/lib/crypto";
import { getShop } from "@/lib/store";
import { getAppUrlFromRequest } from "@/lib/app-url";

function escapeJS(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  if (!isValidShopDomain(shop)) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  const record = getShop(shop);
  if (!record) {
    return NextResponse.json({ error: "Store not connected" }, { status: 404 });
  }

  const token = generateWidgetToken(shop);
  const origin = getAppUrlFromRequest(req);
  const safeToken = escapeJS(token);
  const widgetUrl = `${origin}/widget/${encodeURIComponent(shop)}?token=${safeToken}`;
  const eventUrl = `${origin}/api/events`;

  const js = `(function(){
  if(document.getElementById("returnbot-widget"))return;

  var WIDGET_URL="${escapeJS(widgetUrl)}";
  var EVENT_URL="${escapeJS(eventUrl)}";
  var SHOP="${escapeJS(shop)}";
  function track(name, props){
    try{
      fetch(EVENT_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name,shop:SHOP,path:location.pathname,props:props||{}})});
    }catch(e){}
  }

  var btn=document.createElement("div");
  btn.id="returnbot-widget";
  btn.setAttribute("style","position:fixed;bottom:20px;right:20px;z-index:2147483647;");
  btn.innerHTML='<button id="rb-toggle" style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4f46e5);border:none;cursor:pointer;box-shadow:0 4px 14px rgba(124,58,237,0.4);display:flex;align-items:center;justify-content:center;transition:transform 0.2s,box-shadow 0.2s;" onmouseenter="this.style.transform=\\'scale(1.1)\\';this.style.boxShadow=\\'0 6px 20px rgba(124,58,237,0.5)\\';" onmouseleave="this.style.transform=\\'scale(1)\\';this.style.boxShadow=\\'0 4px 14px rgba(124,58,237,0.4)\\';"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></button>';
  document.body.appendChild(btn);

  var w=window.innerWidth;
  var isMobile=w<640;
  var frame=document.createElement("div");
  frame.id="rb-frame-wrap";
  frame.setAttribute("style",isMobile?"position:fixed;bottom:0;right:0;left:0;top:0;z-index:2147483646;display:none;":"position:fixed;bottom:88px;right:20px;z-index:2147483646;width:380px;height:560px;max-height:calc(100vh - 108px);border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.16);display:none;");
  frame.innerHTML='<iframe src="'+WIDGET_URL+'" style="width:100%;height:100%;border:none;'+(isMobile?'':'border-radius:16px;')+'" allow="clipboard-write"></iframe>';
  document.body.appendChild(frame);
  track("widget_loaded",{mobile:isMobile});

  var open=false;
  document.getElementById("rb-toggle").addEventListener("click",function(){
    open=!open;
    frame.style.display=open?"block":"none";
    if(isMobile){btn.style.display=open?"none":"block";}
    var svg=open?'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>':'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    document.getElementById("rb-toggle").innerHTML=svg;
    if(open){track("widget_open",{mobile:isMobile});}
  });

  window.addEventListener("message",function(e){
    if(e.data==="rb-close"){open=false;frame.style.display="none";if(isMobile){btn.style.display="block";}document.getElementById("rb-toggle").innerHTML='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';}
  });
})();`;

  return new Response(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
