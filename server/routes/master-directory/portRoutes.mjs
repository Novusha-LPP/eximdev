import express from "express";
import PortModel from "../../model/portModel.mjs";

const router = express.Router();

// GET all ports
router.get("/get-ports", async (req, res) => {
    try {
        const ports = await PortModel.find().sort({ port_name: 1 });
        res.json(ports);
    } catch (error) {
        res.status(500).json({ message: "Error fetching ports", error: error.message });
    }
});

// ADD a new port
router.post("/add-port", async (req, res) => {
    try {
        const { port_name, port_code, mode, country } = req.body;
        
        // Check if port code already exists
        const existingPort = await PortModel.findOne({ port_code: port_code.toUpperCase() });
        if (existingPort) {
            return res.status(400).json({ message: "Port code already exists" });
        }

        const newPort = new PortModel({
            port_name,
            port_code: port_code.toUpperCase(),
            mode: mode || 'SEA',
            country: country || port_code.substring(0, 2).toUpperCase()
        });

        await newPort.save();
        res.status(201).json(newPort);
    } catch (error) {
        res.status(400).json({ message: "Error adding port", error: error.message });
    }
});

// UPDATE a port
router.put("/update-port/:id", async (req, res) => {
    try {
        const { port_name, port_code, mode, country } = req.body;
        const updatedPort = await PortModel.findByIdAndUpdate(
            req.params.id,
            { 
                port_name, 
                port_code: port_code.toUpperCase(), 
                mode, 
                country 
            },
            { new: true }
        );
        res.json(updatedPort);
    } catch (error) {
        res.status(400).json({ message: "Error updating port", error: error.message });
    }
});

// SEED ports
router.post("/seed-ports", async (req, res) => {
    try {
        const portsToSeed = [
            "(FIKTK) Kotka", "(GTPRQ) Puerto Quetzal", "(ZADUR) Durban", "(USNYC) New York", "(USLAX) Los Angeles",
            "(GBFXT) Felixstowe", "(USHOU) Houston", "(GBLIV) Liverpool", "(HTPAP) Port-au-Prince", "(GBSOU) Southampton",
            "(SNDKR) Dakar", "(MACAS) Casablanca", "(LBBEY) Beirut", "(HKHKG) Hong Kong", "(LTKLJ) Klaipeda",
            "(PLGDN) Gdansk", "(ESALG) Algeciras", "(SAJED) Jeddah", "(MXVER) Veracruz", "(MXATM) Altamira",
            "(AUMEL) Melbourne", "(CYLMS) Limassol", "(SADMM) Dammam", "(NZLYT) Lyttelton", "(NZWLG) Wellington",
            "(ITNPL) NAPLES(Italy)", "(PTSIE) Sines", "(KWSWK) Shuwaikh", "(CAVAN) Vancouver", "(USNFF) Norfolk",
            "(NZAKL) Auckland", "(ZAZBA) Coega", "(FIHEL) Helsinki (Helsingfor", "(BRSSA) Salvador", "(GBLGP) London Gateway Port",
            "(NLRTM) Rotterdam", "(TRALI) Aliaga", "(VNHPH) Haiphong", "(JOAQJ) Aqaba (El Akaba)", "(TZDAR) Dar es Salaam",
            "(JOAQB) Aqaba Free Zone", "(USKND) Oakland", "(CIABJ) Abidjan", "(NZPOE) Port Chalmers", "(SLFNA) Freetown",
            "(AUSYD) Sydney", "(CNXGG) Xingang", "(CNSHA) Shanghai", "(AEJEA) Jebel Ali", "(AUBNE) Brisbane",
            "(VNSGN) Ho Chi Minh City", "(ESVLC) Valencia", "(PRSJU) San Juan", "(VNTCT) Tan Cang - CAI MEP TERMINAL", "(TRIZT) Izmit",
            "(GRPIR) Piraeus", "(CAMTR) Montreal", "(ESBCN) Barcelona", "(ILHFA) Haifa", "(BDCGP) Chittagong",
            "(MYPKG) Port Klang (Pelabuhan Klang)", "(BHKBS) Khalifa Bin Salman Port", "(BEANR) Antwerpen", "(KRICH) Incheon", "(GBPRU) Portbury",
            "(CNTAO) Qingdao", "(BRSSZ) Santos", "(GHTEM) Tema", "(USSEA) Seattle", "(KRKPO) Pohang",
            "(VNCLI) Cat Lai", "(SGSIN) Singapore", "(DEHAM) Hamburg", "(KRBUS) Busan(Korea)", "(VNOCL) Cat Lai Oil Port",
            "(QAHMD) PORT HAMAD", "(CLVAP) Valparaiso", "(USHSM) Houston", "(CNXMN) Xiamen", "(USOBT) Oakland",
            "(LYMRA) Misurata", "(QADOH) Doha", "(CLCAS) Casablanca", "(USBOS) Boston", "(USSAV) Savannah",
            "(IDTPP) Tanjung Priok", "(SEGOT) Goteborg", "(USCHS) Charleston", "(SEHEL) Helsingborg", "(MXLZC) Lazaro Cardenas",
            "(EETLL) Tallinn", "(TWKHH) Kaohsiung", "(CNDLC) Dalian", "(MZMPM) Maputo", "(DEBRV) Bremerhaven",
            "(CNSZX) Shenzhen", "(CNSHK) Shekou", "(CNNGB) Ningbo", "(VELAG) La Guaira", "(CLARI) Arica",
            "(SVAQJ) Acajutla", "(THLCH) Laem Chabang", "(USOAK) Oakland", "(AUFRE) Fremantle", "(CNTXG) Tianjinxingang",
            "(FIRAU) Rauma (Raumo)", "(BGBOJ) Burgas", "(CLIQQ) Iquique", "(GRSKG) Thessaloniki", "(ILASH) Ashdod",
            "(MXPGO) Progreso", "(BGVAR) Varna", "(NZNSN) Nelson", "(CNWHI) Wuhu", "(MRNKC) Nouakchott",
            "(AUDRW) Darwin", "(PECLL) Callao", "(YEADE) Aden", "(MXZLO) Manzanillo", "(USBAL) Baltimore",
            "(IDSUB) Surabaya", "(PHCEB) Cebu", "(MZBEW) Beira", "(USSSK) Southampton", "(SOMGQ) Mogadishu",
            "(ITGOA) Genoa", "(AUAGS) Augusta", "(KWKWI) Kuwait", "(ITTRS) Trieste", "(TWKEL) Keelung (Chilung)",
            "(CLSAI) San Antonio", "(USSJO) Saint John", "(BHBAH) Bahrain", "(JPYOK) Yokohama", "(USSNQ) Savanna",
            "(AERKT) Ras al Khaimah", "(DOCAU) Caucedo", "(JPUKB) Kobe", "(OMSLL) Salalah", "(AUADL) Adelaide",
            "(USBZB) Baltimore", "(CNTSN) Tianjin", "(UYMVD) Montevideo", "(JPMOJ) Moji/Kitakyushu", "(TRDIL) Diliskelesi",
            "(MUPLU) Port Louis", "(IDJKT) Jakarta", "(CRATM) Altamira", "(CGPNR) Pointe Noire", "(ITAUG) Augusta",
            "(VNVIC) Ho Chi Minh, VICT", "(CNHUA) Huangpu", "(PAROD) Rodman", "(EGDAM) Damietta", "(GBBEL) Belfast",
            "(CNJMN) Jiangmen", "(TRIST) Istanbul", "(ITCAX) GENOVA", "(USEWR) Newark", "(USXMX) Savannah",
            "(NGAPP) Apapa", "(MYPGU) Pasir Gudang", "(SIKOP) Koper", "(GBTEE) Teesport", "(MYLPK) Northport/Pt Klang",
            "(GBLON) London", "(ECGYE) Guayaquil", "(SEHAD) Halmstad", "(TRGEB) Gebze", "(THBKK) Bangkok",
            "(NZBLU) Bluff", "(AEKHL) Mina Khalifa", "(CNXIG) Xingang", "(CNCHE) CHENGDU", "(LVRIX) Riga",
            "(BRNVT) Navegantes", "(CDMAT) Matadi", "(PYASU) Asuncion", "(MXESE) Ensenada", "(ESAGP) Malaga",
            "(USMIA) Miami", "(LRMLW) Monrovia", "(USGHG) Gothenburg", "(CNNKG) Nanjing", "(TNTUN) Tunis",
            "(JMKIN) Kingston", "(FRLEH) Le Havre", "(CLSVE) San Vicente", "(LBBFZ) Beirut Free Zone", "(BRSUA) Suape",
            "(CAHAL) Halifax", "(FRFOS) Fos-sur-Mer", "(ITRAN) Ravenna", "(PEARI) Arica", "(GBGRK) Greenock",
            "(DJJIB) Djibouti", "(USJAO) Jacksonville", "(CNDCB) Da Chan Bay", "(AUPHE) Port Hedland", "(TZZNZ) Zanzibar",
            "(NGTIN) Tincan/Lagos", "(IEDUB) Dublin", "(DOHAI) Rio Haina", "(GNCKY) Conakry", "(PYTER) Terport (San Antonio)",
            "(TRIZM) Izmir", "(BRRIG) Rio Grande", "(TRAMB) Ambarli", "(TRTEK) Tekirdag", "(GBGRG) Grangemouth",
            "(PHMNL) Manila", "(CNXIP) Xingang", "(NZTRG) Tauranga", "(TRMPT) Marport", "(TGLFW) Lome",
            "(CNNSA) Nansha", "(TRGEM) Gemlik", "(COCTG) Cartagena", "(NGLOS) Lagos", "(COBAQ) Barranquilla",
            "(MMRGN) Yangon", "(TRISK) Iskenderun", "(COBUN) Buenaventura", "(ZACPT) Cape Town", "(ESVGO) Vigo",
            "(GMBJL) Banjul", "(CNDCH) Dachang", "(BRVIC) Vila do Conde", "(TRMER) Mersin", "(AEAJM) Ajman",
            "(LYBEN) Bingazi (Benghazi)", "(PHMNN) Manila North Harbour", "(TRYAR) Yarimca", "(JPNGO) Nagoya, Aichi", "(JPOSA) Osaka",
            "(HNPCR) Puerto Cortes", "(USTIW) Tacoma", "(NOOSL) OSLO", "(CRCAL) Caldera", "(DKCPH) Kobenhavn",
            "(CLLQN) Lirquen", "(IDPGX) Pangkal Balam, Banka", "(CRPMN) Puerto Moin", "(PLGDY) Gdynia", "(ECPRO) Progress",
            "(KEMBA) Mombasa", "(USKOG) Copenhagen", "(VNVUT) Vung Tau", "(IEBTM) Baltimore", "(THLKR) Lat Krabang",
            "(CNNBP) Ningbo Pt", "(USAPF) Naples", "(USZ2A) Baltimore", "(CLCLD) Caldera", "(JPHTD) Hakata",
            "(ARBUE) Buenos Aires", "(CNQZH) Qinzhou", "(ARZAE) Zarate"
        ];

        const portObjects = portsToSeed.map(entry => {
            const match = entry.match(/\((.*?)\)\s*(.*)/);
            if (match) {
                const code = match[1].trim().toUpperCase();
                const name = match[2].trim();
                return {
                    port_name: name,
                    port_code: code,
                    country: code.substring(0, 2),
                    mode: 'SEA'
                };
            }
            return null;
        }).filter(Boolean);

        // Batch insert with ordered: false to skip duplicates
        const result = await PortModel.insertMany(portObjects, { ordered: false });
        res.json({ message: "Successfully seeded ports", count: result.length });
    } catch (error) {
        // If it's just duplicate keys error, we still return success with how many were skipped
        if (error.code === 11000 || (error.writeErrors && error.writeErrors.length > 0)) {
            const insertedCount = error.result?.nInserted || 0;
            res.json({ message: "Ports partially seeded (skipped duplicates)", count: insertedCount });
        } else {
            res.status(500).json({ message: "Error seeding ports", error: error.message });
        }
    }
});

export default router;
