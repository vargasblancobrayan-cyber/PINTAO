const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STORE_FILE = process.env.DATA_FILE ? path.resolve(process.env.DATA_FILE) : path.join(DATA_DIR, 'store.json');
const PORT = Number(process.env.PORT || 4173);
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || 'admin@pintao.local').toLowerCase();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || 'Pintao2026!');
const SESSION_TTL = 1000 * 60 * 60 * 10;
const sessions = new Map();
const loginAttempts = new Map();

const rawProducts = [
  [1,'Polo Azul Nocturno',56900,'Camisetas','Azul',['S','M','L','XL'],32,'https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?auto=format&fit=crop&w=900&q=85','Esencial de cuello polo con estructura limpia y tacto suave.'],
  [2,'Camiseta Premium Carbón',54900,'Básicas','Negro',['S','M','L','XL','XXL'],28,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85','Camiseta versátil de corte regular para una rotación comercial constante.'],
  [3,'Oversize Arena',49900,'Oversize','Crema',['S','M','L','XL'],19,'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=85','Silueta amplia, hombro caído y presencia urbana.'],
  [4,'Polo Essential Blanco',57900,'Camisetas','Blanco',['S','M','L','XL'],36,'https://images.unsplash.com/photo-1625910513413-5fc45e7b3086?auto=format&fit=crop&w=900&q=85','Polo luminoso para vitrinas de básicos premium.'],
  [5,'Chaqueta Urban Negra',98900,'Chaquetas','Negro',['S','M','L','XL'],13,'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85','Chaqueta ligera con estética nocturna y acabado resistente.'],
  [6,'Buzo Active Arena',74900,'Deportiva','Crema',['S','M','L','XL'],21,'https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=900&q=85','Capa cómoda para movimiento diario y looks deportivos.'],
  [7,'Jean Slim Índigo',89900,'Jeans','Azul',['30','32','34','36','38'],24,'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=85','Denim índigo de silueta slim y construcción comercial.'],
  [8,'Cargo Utility Negro',84900,'Cargos','Negro',['30','32','34','36'],17,'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85','Pantalón cargo con bolsillos funcionales y caída contemporánea.'],
  [9,'Gorra Essential Negra',35900,'Gorras','Negro',['ÚNICA'],40,'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=900&q=85','Accesorio ajustable de seis paneles y acabado mate.'],
  [10,'Camiseta Training Blanca',52900,'Deportiva','Blanco',['S','M','L','XL'],31,'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=900&q=85','Camiseta liviana para actividad, viaje y uso cotidiano.'],
  [11,'Chaqueta Denim Azul',119900,'Chaquetas','Azul',['S','M','L','XL'],8,'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?auto=format&fit=crop&w=900&q=85','Denim estructurado con lavado azul y herrajes metálicos.'],
  [12,'Gorra Premium Crema',38900,'Gorras','Crema',['ÚNICA'],27,'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=85','Gorra tonal para completar colecciones neutras.'],
  [13,'Tenis Urban Blanco',129900,'Zapatos','Blanco',['39','40','41','42','43'],18,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85','Tenis de perfil limpio y suela confortable.'],
  [14,'Perfume Signature Noir',159900,'Perfumes','Negro',['100 ML'],14,'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85','Aroma amaderado de carácter nocturno y larga duración.'],
  [15,'Morral Executive Negro',89900,'Morrales','Negro',['ÚNICA'],12,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85','Morral funcional con compartimentos para trabajo y viaje.'],
  [16,'Correa Classic Café',44900,'Correas','Café',['M','L','XL'],22,'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=85','Correa clásica de textura sobria y hebilla metálica.'],
  [17,'Camiseta Gráfica District',59900,'Estampadas','Negro',['S','M','L','XL'],25,'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85','Gráfico frontal de inspiración urbana sobre algodón de alto gramaje.'],
  [18,'Básica Heavy Blanco',51900,'Básicas','Blanco',['S','M','L','XL'],30,'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85','Básica de alto gramaje, cuello reforzado y tacto compacto.'],
  [19,'Pantalón Chino Piedra',79900,'Pantalones','Crema',['30','32','34','36'],20,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85','Chino versátil con pinza suave y ajuste cómodo.'],
  [20,'Bermuda Resort Arena',64900,'Bermudas','Crema',['30','32','34','36'],22,'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=900&q=85','Bermuda liviana de largo comercial para clima cálido.'],
  [21,'Oversize Washed Grafito',62900,'Oversize','Negro',['S','M','L','XL'],18,'https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=900&q=85','Oversize de lavado grafito con tacto vintage.'],
  [22,'Jean Straight Vintage',94900,'Jeans','Azul',['30','32','34','36','38'],16,'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=85','Jean recto de lavado medio y construcción resistente.']
];

function buildVariants(id, sizes, color, stock) {
  const base = Math.floor(stock / sizes.length);
  const extra = stock % sizes.length;
  return sizes.map((size, index) => ({
    size,
    color,
    stock: base + (index < extra ? 1 : 0),
    sku: `PNT-${id}-${String(size).replace(/\s/g, '')}`
  }));
}

const seedProducts = rawProducts.map(([id,name,price,category,color,sizes,stock,img,description]) => ({
  id,name,price,category,color,sizes,stock,img,description,
  composition: category === 'Perfumes' ? 'Presentación de 100 ml.' : 'Composición y ficha técnica disponibles para compradores registrados.',
  care: category === 'Perfumes' ? 'Conservar en un lugar fresco y protegido de la luz.' : 'Seguir las instrucciones de la etiqueta de cuidado.',
  variants: buildVariants(id,sizes,color,stock), gallery:[img], tag:id % 4 === 0 ? 'DESTACADO' : 'NUEVO', active:true
}));

function initialStore(){return {products:seedProducts,users:[],orders:[],quotes:[],newsletter:[],settings:{brand:'PINTAO',freeShipping:250000,minOrder:1,whatsapp:'',currency:'COP'}}}
function repairText(value){if(typeof value==='string'&&/[ÃÂ]/.test(value)){try{return Buffer.from(value,'latin1').toString('utf8')}catch{return value}}return value}
function repairDeep(value){if(Array.isArray(value))return value.map(repairDeep);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,repairDeep(v)]));return repairText(value)}
function migrateStore(input){
  const repaired=repairDeep(input),store={...initialStore(),...repaired};
  store.users=Array.isArray(store.users)?store.users:[];store.orders=Array.isArray(store.orders)?store.orders:[];store.quotes=Array.isArray(store.quotes)?store.quotes:[];store.newsletter=Array.isArray(store.newsletter)?store.newsletter:[];
  const byLegacyId=new Map((store.products||[]).map(p=>[Number(p.id),p]));
  store.products=seedProducts.map(seed=>{
    const old=byLegacyId.get(seed.id);if(!old)return seed;
    const merged={...seed,...old,name:seed.name,category:seed.category,description:old.description||seed.description,composition:old.composition||seed.composition,care:old.care||seed.care};
    merged.variants=Array.isArray(old.variants)&&old.variants.length?old.variants:buildVariants(seed.id,seed.sizes,seed.color,Number(old.stock??seed.stock));
    merged.stock=merged.variants.reduce((sum,v)=>sum+Number(v.stock||0),0);merged.sizes=merged.variants.map(v=>v.size);merged.gallery=Array.isArray(old.gallery)&&old.gallery.length?old.gallery:[merged.img];return merged;
  });
  const productKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const seedNames=new Set(seedProducts.map(p=>productKey(p.name)));
  const custom=(repaired.products||[]).filter(p=>!seedProducts.some(s=>s.id===Number(p.id))&&!seedNames.has(productKey(p.name))).map(p=>{const sizes=Array.isArray(p.sizes)&&p.sizes.length?p.sizes:['ÚNICA'];const variants=Array.isArray(p.variants)&&p.variants.length?p.variants:buildVariants(p.id,sizes,p.color||'Negro',Number(p.stock||0));return {...p,sizes,variants,stock:variants.reduce((s,v)=>s+Number(v.stock||0),0),gallery:Array.isArray(p.gallery)&&p.gallery.length?p.gallery:[p.img].filter(Boolean),active:p.active!==false}});
  store.products.push(...custom);store.products.forEach(product=>product.variants?.forEach(variant=>{variant.sku=String(variant.sku||'').replace(/^PU-/,'PNT-')}));store.settings={...initialStore().settings,...store.settings};if(/^Punto Uno/i.test(store.settings.brand||''))store.settings.brand='PINTAO';return store;
}
function loadStore(){fs.mkdirSync(path.dirname(STORE_FILE),{recursive:true});if(!fs.existsSync(STORE_FILE))fs.writeFileSync(STORE_FILE,JSON.stringify(initialStore(),null,2));const store=migrateStore(JSON.parse(fs.readFileSync(STORE_FILE,'utf8')));return store}
function saveStore(store){const temp=STORE_FILE+'.tmp';fs.writeFileSync(temp,JSON.stringify(store,null,2));fs.renameSync(temp,STORE_FILE)}
function json(res,status,data,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data))}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>1e6){reject(new Error('Solicitud demasiado grande'));req.destroy()}});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error('JSON inválido'))}});req.on('error',reject)})}
function hash(password,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')}}
function safeUser(user){return {id:user.id,name:user.name,email:user.email,type:user.type,createdAt:user.createdAt}}
function rate(count){return count>=48?.25:count>=24?.18:count>=12?.10:0}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}))}
function session(req,role){const token=cookies(req)[role==='admin'?'pu_admin':'pu_customer'],entry=sessions.get(token);if(!entry||entry.role!==role||entry.expires<Date.now()){if(token)sessions.delete(token);return null}entry.expires=Date.now()+SESSION_TTL;return entry}
function createSession(res,role,data){const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{role,...data,expires:Date.now()+SESSION_TTL});const name=role==='admin'?'pu_admin':'pu_customer';return `${name}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL/1000)}`}
function clearSession(req,role){const name=role==='admin'?'pu_admin':'pu_customer',token=cookies(req)[name];if(token)sessions.delete(token);return `${name}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`}
function requireAdmin(req,res){if(session(req,'admin'))return true;json(res,401,{error:'Inicia sesión como administrador'});return false}
function sameOrigin(req){const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===req.headers.host}catch{return false}}
function clean(value,max=160){return String(value||'').trim().slice(0,max)}
function enrichProduct(p){return {...p,keywords:[p.name,p.category,p.color,p.description,...(p.sizes||[])].join(' ').toLowerCase()}}
function stats(store){return {products:store.products.length,orders:store.orders.length,customers:store.users.length,revenue:store.orders.filter(o=>['Pagado','Enviado','Completado'].includes(o.status)).reduce((s,o)=>s+o.total,0),lowStock:store.products.filter(p=>p.stock<10).length,recentOrders:store.orders.slice(-8).reverse()}}

async function api(req,res,url){
  if(['POST','PATCH','DELETE'].includes(req.method)&&!sameOrigin(req))return json(res,403,{error:'Origen no permitido'});
  const store=loadStore();
  if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true,products:store.products.length,orders:store.orders.length});
  if(req.method==='GET'&&url.pathname==='/api/settings')return json(res,200,store.settings);
  if(req.method==='GET'&&url.pathname==='/api/products')return json(res,200,store.products.filter(p=>p.active).map(enrichProduct));
  if(req.method==='GET'&&url.pathname.startsWith('/api/products/')){const p=store.products.find(x=>x.id===Number(url.pathname.split('/').pop())&&x.active);return p?json(res,200,enrichProduct(p)):json(res,404,{error:'Producto no encontrado'})}

  if(req.method==='POST'&&url.pathname==='/api/admin/login'){
    const key=req.socket.remoteAddress||'local',attempt=loginAttempts.get(key)||{count:0,until:0};if(attempt.until>Date.now())return json(res,429,{error:'Espera unos minutos antes de intentarlo de nuevo'});
    const b=await body(req);if(clean(b.email).toLowerCase()!==ADMIN_EMAIL||String(b.password||'')!==ADMIN_PASSWORD){attempt.count++;if(attempt.count>=5){attempt.until=Date.now()+600000;attempt.count=0}loginAttempts.set(key,attempt);return json(res,401,{error:'Credenciales administrativas incorrectas'})}
    loginAttempts.delete(key);return json(res,200,{ok:true,user:{name:'Administrador',email:ADMIN_EMAIL}},{'Set-Cookie':createSession(res,'admin',{email:ADMIN_EMAIL})});
  }
  if(req.method==='GET'&&url.pathname==='/api/admin/session'){const admin=session(req,'admin');return admin?json(res,200,{authenticated:true,user:{name:'Administrador',email:admin.email}}):json(res,401,{authenticated:false})}
  if(req.method==='POST'&&url.pathname==='/api/admin/logout')return json(res,200,{ok:true},{'Set-Cookie':clearSession(req,'admin')});
  if(url.pathname.startsWith('/api/admin/')&&!requireAdmin(req,res))return;
  if((url.pathname==='/api/products'||url.pathname.startsWith('/api/products/'))&&['POST','PATCH','DELETE'].includes(req.method)&&!requireAdmin(req,res))return;

  if(req.method==='GET'&&url.pathname==='/api/admin/stats')return json(res,200,stats(store));
  if(req.method==='GET'&&url.pathname==='/api/admin/orders')return json(res,200,store.orders.slice().reverse());
  if(req.method==='GET'&&url.pathname==='/api/admin/quotes')return json(res,200,store.quotes.slice().reverse());
  if(req.method==='GET'&&url.pathname==='/api/admin/customers')return json(res,200,store.users.map(safeUser));
  if(req.method==='PATCH'&&url.pathname==='/api/admin/settings'){const b=await body(req);store.settings={...store.settings,brand:clean(b.brand,80)||store.settings.brand,whatsapp:clean(b.whatsapp,30).replace(/\D/g,''),minOrder:Math.max(1,Number(b.minOrder||store.settings.minOrder)),freeShipping:Math.max(0,Number(b.freeShipping||store.settings.freeShipping))};saveStore(store);return json(res,200,store.settings)}

  if(req.method==='POST'&&url.pathname==='/api/products'){
    const b=await body(req),name=clean(b.name),price=Number(b.price);if(!name||!Number.isFinite(price)||price<=0)return json(res,400,{error:'Nombre y precio válidos son obligatorios'});
    const sizes=Array.isArray(b.sizes)&&b.sizes.length?b.sizes.map(x=>clean(x,20)):['ÚNICA'],stock=Math.max(0,Number(b.stock||0)),id=Date.now();
    const product={id,name,price,category:clean(b.category)||'Camisetas',color:clean(b.color)||'Negro',sizes,stock,img:clean(b.img,500)||seedProducts[0].img,gallery:[clean(b.img,500)||seedProducts[0].img],description:clean(b.description,500)||'Referencia disponible para compra mayorista.',composition:clean(b.composition,300),care:clean(b.care,300),variants:buildVariants(id,sizes,clean(b.color)||'Negro',stock),tag:clean(b.tag,30)||'NUEVO',active:true};store.products.push(product);saveStore(store);return json(res,201,enrichProduct(product));
  }
  if(req.method==='PATCH'&&url.pathname.startsWith('/api/products/')){
    const id=Number(url.pathname.split('/').pop()),b=await body(req),p=store.products.find(x=>x.id===id);if(!p)return json(res,404,{error:'Producto no encontrado'});
    ['name','category','color','img','description','composition','care','tag'].forEach(k=>{if(b[k]!==undefined)p[k]=clean(b[k],k==='img'?500:500)});if(b.price!==undefined)p.price=Math.max(1,Number(b.price));if(b.active!==undefined)p.active=Boolean(b.active);
    if(Array.isArray(b.sizes)&&b.sizes.length){p.sizes=b.sizes.map(x=>clean(x,20));p.variants=buildVariants(p.id,p.sizes,p.color,Number(b.stock??p.stock))}else if(b.stock!==undefined){p.variants=buildVariants(p.id,p.sizes,p.color,Math.max(0,Number(b.stock)))}p.stock=p.variants.reduce((s,v)=>s+Number(v.stock||0),0);p.gallery=[p.img];saveStore(store);return json(res,200,enrichProduct(p));
  }
  if(req.method==='DELETE'&&url.pathname.startsWith('/api/products/')){const id=Number(url.pathname.split('/').pop()),p=store.products.find(x=>x.id===id);if(!p)return json(res,404,{error:'Producto no encontrado'});p.active=false;saveStore(store);return json(res,200,{ok:true})}
  if(req.method==='PATCH'&&url.pathname.startsWith('/api/admin/orders/')){
    const id=decodeURIComponent(url.pathname.split('/').pop()),b=await body(req),order=store.orders.find(x=>x.id===id);if(!order)return json(res,404,{error:'Pedido no encontrado'});const allowed=['Pendiente de confirmación','Pagado','Enviado','Completado','Cancelado'];if(!allowed.includes(b.status))return json(res,400,{error:'Estado no válido'});
    if(b.status==='Cancelado'&&!order.stockReleased){for(const item of order.items){const p=store.products.find(x=>x.id===item.productId),v=p?.variants?.find(x=>x.size===item.size);if(v){v.stock+=item.qty;p.stock+=item.qty}}order.stockReleased=true}order.status=b.status;saveStore(store);return json(res,200,order);
  }

  if(req.method==='POST'&&url.pathname==='/api/register'){
    const b=await body(req),email=clean(b.email).toLowerCase(),password=String(b.password||'');if(!/^\S+@\S+\.\S+$/.test(email)||password.length<8)return json(res,400,{error:'Correo válido y contraseña de 8 caracteres requeridos'});if(store.users.some(u=>u.email===email))return json(res,409,{error:'El correo ya está registrado'});const secured=hash(password),user={id:crypto.randomUUID(),name:clean(b.name)||'Cliente mayorista',email,type:clean(b.type)||'Persona natural',...secured,createdAt:new Date().toISOString()};store.users.push(user);saveStore(store);return json(res,201,{user:safeUser(user)},{'Set-Cookie':createSession(res,'customer',{userId:user.id})});
  }
  if(req.method==='POST'&&url.pathname==='/api/login'){
    const b=await body(req),user=store.users.find(u=>u.email===clean(b.email).toLowerCase());if(!user)return json(res,401,{error:'Credenciales incorrectas'});const attempt=hash(b.password||'',user.salt).hash;if(attempt.length!==user.hash.length||!crypto.timingSafeEqual(Buffer.from(attempt),Buffer.from(user.hash)))return json(res,401,{error:'Credenciales incorrectas'});return json(res,200,{user:safeUser(user)},{'Set-Cookie':createSession(res,'customer',{userId:user.id})});
  }
  if(req.method==='POST'&&url.pathname==='/api/logout')return json(res,200,{ok:true},{'Set-Cookie':clearSession(req,'customer')});
  if(req.method==='GET'&&url.pathname==='/api/account'){const entry=session(req,'customer');if(!entry)return json(res,401,{error:'Inicia sesión'});const user=store.users.find(u=>u.id===entry.userId);if(!user)return json(res,401,{error:'Sesión inválida'});return json(res,200,{user:safeUser(user),orders:store.orders.filter(o=>o.customer?.email===user.email).slice().reverse()})}
  if(req.method==='POST'&&url.pathname==='/api/orders'){
    const b=await body(req);if(!Array.isArray(b.items)||!b.items.length)return json(res,400,{error:'El pedido está vacío'});let base=0,count=0;const items=[];
    for(const item of b.items){const p=store.products.find(x=>x.id===Number(item.id)&&x.active),qty=Math.max(1,Math.min(99,Number(item.qty||1))),variant=p?.variants?.find(v=>v.size===clean(item.size,20));if(!p||!variant||variant.stock<qty)return json(res,409,{error:`Inventario insuficiente para ${p?.name||'el producto seleccionado'}`});variant.stock-=qty;p.stock-=qty;base+=p.price*qty;count+=qty;items.push({productId:p.id,name:p.name,price:p.price,qty,size:variant.size,img:p.img})}
    if(count<Number(store.settings.minOrder||1))return json(res,400,{error:`El pedido mínimo es de ${store.settings.minOrder} unidades combinadas`});
    const customer={name:clean(b.customer?.name),email:clean(b.customer?.email).toLowerCase(),phone:clean(b.customer?.phone,30),document:clean(b.customer?.document,40),city:clean(b.customer?.city,80),address:clean(b.customer?.address,180),type:clean(b.customer?.type)||'Persona natural'};if(!customer.name||!/^\S+@\S+\.\S+$/.test(customer.email)||!customer.phone||!customer.address)return json(res,400,{error:'Completa correctamente los datos de entrega'});
    const discount=rate(count),coupon=String(b.coupon||'').toUpperCase()==='PINTAO10'?.10:0,total=Math.round(base*(1-discount)*(1-coupon));const order={id:'PNT-'+Date.now().toString().slice(-8),items,base,discount,coupon,total,status:'Pendiente de confirmación',customer,payment:['Transferencia bancaria','Enlace de pago'].includes(b.payment)?b.payment:'Enlace de pago',createdAt:new Date().toISOString(),stockReleased:false};store.orders.push(order);saveStore(store);return json(res,201,order);
  }
  if(req.method==='POST'&&url.pathname==='/api/quotes'){const b=await body(req),quote={id:'COT-'+Date.now().toString().slice(-6),name:clean(b.name),phone:clean(b.phone,30),quantity:clean(b.quantity,60),message:clean(b.message,800),status:'Nueva',createdAt:new Date().toISOString()};if(!quote.name||!quote.phone)return json(res,400,{error:'Nombre y WhatsApp son obligatorios'});store.quotes.push(quote);saveStore(store);return json(res,201,quote)}
  if(req.method==='POST'&&url.pathname==='/api/newsletter'){const b=await body(req),email=clean(b.email).toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email))return json(res,400,{error:'Escribe un correo válido'});if(!store.newsletter.some(x=>x.email===email)){store.newsletter.push({email,createdAt:new Date().toISOString()});saveStore(store)}return json(res,201,{ok:true})}
  return json(res,404,{error:'Ruta no encontrada'});
}

const routeFiles={'/':'index.html','/catalogo':'catalogo.html','/producto':'producto.html','/checkout':'checkout.html','/cuenta':'cuenta.html','/informacion':'informacion.html','/acceso':'acceso.html','/admin':'admin.html','/admin/login':'admin-login.html'};
function routeFile(pathname){if(routeFiles[pathname])return routeFiles[pathname];if(/^\/producto\/\d+$/.test(pathname))return 'producto.html';return decodeURIComponent(pathname).replace(/^\/+/, '')}
function serve(res,pathname){const rel=routeFile(pathname),file=path.resolve(ROOT,rel);if(!file.startsWith(ROOT)||file.includes(`${path.sep}data${path.sep}`))return json(res,403,{error:'Acceso denegado'});fs.readFile(file,(err,data)=>{if(err)return json(res,404,{error:'Página no encontrada'});const ext=path.extname(file),types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':ext==='.html'?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});res.end(data)})}

const server=http.createServer(async(req,res)=>{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);try{if(url.pathname.startsWith('/api/'))return await api(req,res,url);if(req.method!=='GET')return json(res,405,{error:'Método no permitido'});if(['/admin','/admin.html'].includes(url.pathname)&&!session(req,'admin')){res.writeHead(302,{Location:'/admin/login'});return res.end()}serve(res,url.pathname)}catch(error){console.error(error);json(res,500,{error:error.message==='JSON inválido'||error.message==='Solicitud demasiado grande'?error.message:'Error interno'})}});
server.listen(PORT,'127.0.0.1',()=>{const store=loadStore();saveStore(store);console.log(`PINTAO listo en http://127.0.0.1:${PORT}`);console.log(`Administrador local: ${ADMIN_EMAIL}`)});
