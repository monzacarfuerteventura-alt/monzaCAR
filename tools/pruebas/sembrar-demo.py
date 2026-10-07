# Siembra datos de ejemplo en el servidor local de pruebas (tools/pruebas/servidor-local.mjs) para ver el panel «con vida».
#   bun tools/pruebas/servidor-local.mjs   y en otra ventana:   python3 tools/pruebas/sembrar-demo.py
# NO toca la web real: solo habla con http://localhost:8888 (memoria del servidor de pruebas).
import json, urllib.request, pathlib, datetime

BASE = "http://localhost:8888"
CLAVE = "clave-de-pruebas-larga-2026"
RAIZ = pathlib.Path(__file__).resolve().parents[2]

def llamar(metodo, ruta, token="", cuerpo=None, crudo=None, tipo="application/json"):
    datos = crudo if crudo is not None else (json.dumps(cuerpo).encode() if cuerpo is not None else None)
    req = urllib.request.Request(BASE + ruta, data=datos, method=metodo, headers={"content-type": tipo, **({"authorization": "Bearer " + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as r: t = r.read(); return r.status, (json.loads(t) if t else {})
    except urllib.error.HTTPError as e:
        t = e.read()
        try: return e.code, json.loads(t)
        except Exception: return e.code, {"error": t[:120].decode("utf8", "ignore")}

s, lg = llamar("POST", "/api/login", "", {"clave": CLAVE}); T = lg.get("token") or lg.get("sesion") or ""
print("login", s, bool(T))

# --- coches (fotos fijas del repositorio) ---
fotos = {"astra": [f"/coches/opel-astra-2010/{i}.jpg" for i in (1, 2, 3)], "tourneo": [f"/coches/ford-tourneo-connect-2007/{i}.jpg" for i in (1, 2, 3)]}
coches = [
    ("Opel", "Astra", "1.7 CDTI Enjoy", 2010, 168000, "Diésel", "Manual", 3900, "astra", "disponible", True),
    ("Ford", "Tourneo Connect", "1.8 TDCi", 2007, 212000, "Diésel", "Manual", 2900, "tourneo", "disponible", False),
    ("Seat", "Ibiza", "1.2 TSI Style", 2014, 121000, "Gasolina", "Manual", 5200, "astra", "reservado", False),
    ("Renault", "Clio", "1.5 dCi Zen", 2012, 189000, "Diésel", "Manual", 3300, "tourneo", "disponible", False),
    ("Toyota", "Yaris", "1.0 VVT-i Active", 2011, 97000, "Gasolina", "Manual", 4800, "astra", "vendido", False),
    ("Volkswagen", "Golf", "1.6 TDI Edition", 2013, 205000, "Diésel", "Manual", 5500, "tourneo", "disponible", True),
]
for m, mo, v, a, km, co, ca, pr, f, es, de in coches:
    s, r = llamar("POST", "/api/coches", T, {"marca": m, "modelo": mo, "version": v, "anio": a, "km": km, "combustible": co, "cambio": ca, "precio": pr, "estado": es, "destacado": de, "fotos": fotos[f], "cv": 90, "puertas": 5, "color": "Gris", "descripcion": "Revisado en taller, ITV al día."})
    print("coche", mo, s)

# --- CRM ---
leads = [("taller", "María Pérez", "600111222", "Ruido al frenar, Seat Ibiza", "nueva"), ("coche", "Juan Cabrera", "611222333", "Me interesa el Opel Astra", "nueva"),
         ("taller", "Hotel Costa Antigua", "928000111", "Revisión de 3 furgonetas", "contactado"), ("financiacion", "Ana Rodríguez", "622333444", "Quiero financiar un Golf", "contactado"),
         ("taller", "Pedro Santana", "633444555", "Cambio de aceite y filtros", "cerrada"), ("coche", "Lucía Marrero", "644555666", "¿Tenéis algún monovolumen?", "nueva")]
for tipo, n, t, msg, est in leads:
    s, r = llamar("POST", "/api/solicitudes", T, {"manual": True, "tipo": tipo, "nombre": n, "telefono": t, "mensaje": msg})
    if r.get("id") and est != "nueva": llamar("PATCH", "/api/solicitudes/" + r["id"], T, {"estado": est})
    print("lead", n, s)

# --- Taller: órdenes en distintas fases ---
ordenes = [("María Pérez", "600111222", "1234ABC", "Seat Ibiza 2016", "recibido"), ("Carlos Díaz", "655666777", "5678DEF", "Renault Clio 2012", "diagnostico"),
           ("Hotel Costa Antigua", "928000111", "9012GHI", "Ford Transit 2015", "reparacion"), ("Luis Hernández", "666777888", "3456JKL", "Toyota Corolla 2009", "calidad"),
           ("Marta Suárez", "677888999", "7890MNO", "Opel Corsa 2013", "entregado")]
tokens = []
for n, t, mat, mm, est in ordenes:
    s, r = llamar("POST", "/api/taller/recepcion", T, {"cliente": {"nombre": n, "telefono": t}, "vehiculo": {"matricula": mat, "marcaModelo": mm, "km": "120000"}, "tipoEntrada": "reparacion"})
    tk = (r.get("orden") or {}).get("token"); tokens.append(tk); print("orden", mat, s)
    if tk and est != "recibido": print("  estado", est, llamar("PATCH", "/api/ordenes/" + tk, T, {"estado": est, "presupuesto": {"lineas": [{"c": "Pastillas de freno", "n": 1, "p": 60}, {"c": "Mano de obra", "n": 2, "p": 40}], "igic": 7}})[0])

# --- Almacén ---
for nombre, sku, stock, pvp, coste in [("Aceite 5W30 5L", "ACE-5W30", 14, 42, 28), ("Filtro de aceite", "FIL-ACE", 22, 12, 6), ("Pastillas freno delanteras", "PAS-DEL", 3, 55, 31), ("Batería 60Ah", "BAT-60", 2, 95, 62)]:
    s, r = llamar("POST", "/api/almacen/pieza", T, {"nombre": nombre, "sku": sku, "stock": stock, "pvp": pvp, "coste": coste, "minimo": 4, "unidad": "ud"}); print("pieza", nombre, s, r.get("error", ""))
for nombre in ["Llave dinamométrica", "Gato hidráulico 3T", "Máquina de diagnosis OBD"]:
    s, r = llamar("POST", "/api/almacen/herramienta", T, {"nombre": nombre}); print("herramienta", nombre, s, r.get("error", ""))

# --- Caja y finanzas ---
print("caja abrir", llamar("POST", "/api/caja/abrir", T, {"desglose": {"2000": 2, "500": 2}})[0])
for tipo, imp, cat, conc in [("ingreso", "85", "taller", "Cambio de aceite Clio"), ("ingreso", "240", "taller", "Frenos Corolla"), ("ingreso", "30", "otro", "Venta de ambientadores")]:
    print("mov", conc, llamar("POST", "/api/caja/movimiento", T, {"tipo": tipo, "importe": imp, "categoria": cat, "concepto": conc, "ref": conc[:6]})[0])
hoy = datetime.date.today().isoformat()
foto = (RAIZ / "public/coches/opel-astra-2010/1.jpg").read_bytes()
s, fr = llamar("POST", "/api/fotos", T, crudo=foto, tipo="image/jpeg"); print("foto", s, fr)
for prov, conc, base, cat in [("Recambios Atlántico SL", "Pedido de aceite y filtros", "310", "recambios"), ("Endesa", "Factura de luz de septiembre", "184,50", "luz")]:
    print("gasto", prov, llamar("POST", "/api/finanzas/gasto", T, {"fecha": hoy, "categoria": cat, "proveedor": prov, "concepto": conc, "base": base, "impuestoPct": "7", "metodo": "transferencia", "adjunto": fr.get("key", "")}))
print("ingreso", llamar("POST", "/api/finanzas/ingreso", T, {"fecha": hoy, "concepto": "Venta de accesorios", "base": "400", "impuestoPct": "7", "metodo": "transferencia"})[0])
print("OK sembrado")
