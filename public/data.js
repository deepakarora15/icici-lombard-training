// ===== INCOTERMS DATA =====
const incotermsData = [
    {
        code: "EXW",
        name: "Ex Works",
        group: "E",
        transport: "any",
        description: "Seller makes goods available at their premises; buyer handles almost everything.",
        riskTransfer: "When goods are placed at seller's premises.",
        costAllocation: "Buyer pays all logistics, export, import, insurance.",
        sellerResponsibilities: "Makes goods available only.",
        buyerResponsibilities: "All transport + customs.",
        notes: "Minimum seller obligation.",
        sellerRiskPercent: 5,
        buyerRiskPercent: 95
    },
    {
        code: "FCA",
        name: "Free Carrier",
        group: "F",
        transport: "any",
        description: "Seller delivers goods to buyer's carrier at agreed point.",
        riskTransfer: "At handover to first carrier.",
        costAllocation: "Seller: Export; Buyer: Freight + import.",
        sellerResponsibilities: "Export clearance, deliver to carrier.",
        buyerResponsibilities: "Main freight, import clearance.",
        notes: "Best for container cargo.",
        sellerRiskPercent: 20,
        buyerRiskPercent: 80
    },
    {
        code: "CPT",
        name: "Carriage Paid To",
        group: "C",
        transport: "any",
        description: "Seller pays transport to destination; risk passes earlier.",
        riskTransfer: "When goods are given to first carrier.",
        costAllocation: "Seller: Freight; Buyer: Insurance + import.",
        sellerResponsibilities: "Arrange transport to destination.",
        buyerResponsibilities: "Insurance + import.",
        notes: "Risk vs cost differ.",
        sellerRiskPercent: 25,
        buyerRiskPercent: 75
    },
    {
        code: "CIP",
        name: "Carriage & Insurance Paid To",
        group: "C",
        transport: "any",
        description: "Same as CPT but seller must insure goods at higher coverage.",
        riskTransfer: "At first carrier handover.",
        costAllocation: "Seller: Freight + insurance; Buyer: import.",
        sellerResponsibilities: "Freight + mandatory insurance.",
        buyerResponsibilities: "Import clearance.",
        notes: "Insurance required (ICC A equivalent).",
        sellerRiskPercent: 35,
        buyerRiskPercent: 65
    },
    {
        code: "DAP",
        name: "Delivered at Place",
        group: "D",
        transport: "any",
        description: "Seller delivers goods ready for unloading at destination.",
        riskTransfer: "When goods arrive ready for unloading.",
        costAllocation: "Seller: Transport; Buyer: import duties.",
        sellerResponsibilities: "Transport until destination.",
        buyerResponsibilities: "Import clearance + duties.",
        notes: "Unloading is buyer's job.",
        sellerRiskPercent: 75,
        buyerRiskPercent: 25
    },
    {
        code: "DPU",
        name: "Delivered at Place Unloaded",
        group: "D",
        transport: "any",
        description: "Seller delivers goods unloaded at the destination.",
        riskTransfer: "After unloading at final point.",
        costAllocation: "Seller: Transport + unloading; Buyer: import.",
        sellerResponsibilities: "Transport + unloading.",
        buyerResponsibilities: "Import clearance.",
        notes: "Only term where seller unloads.",
        sellerRiskPercent: 85,
        buyerRiskPercent: 15
    },
    {
        code: "DDP",
        name: "Delivered Duty Paid",
        group: "D",
        transport: "any",
        description: "Seller handles everything including import duties.",
        riskTransfer: "When goods arrive at destination, ready for unloading.",
        costAllocation: "Seller: All costs including import duties.",
        sellerResponsibilities: "Transport, export + import clearance.",
        buyerResponsibilities: "Unloading.",
        notes: "Highest seller responsibility.",
        sellerRiskPercent: 95,
        buyerRiskPercent: 5
    },
    {
        code: "FAS",
        name: "Free Alongside Ship",
        group: "F",
        transport: "sea",
        description: "Seller places goods next to ship at port (sea only).",
        riskTransfer: "When goods are alongside ship.",
        costAllocation: "Seller: Export; Buyer: Loading + freight.",
        sellerResponsibilities: "Deliver alongside vessel.",
        buyerResponsibilities: "Load, ship transport, import.",
        notes: "For bulk cargo.",
        sellerRiskPercent: 15,
        buyerRiskPercent: 85
    },
    {
        code: "FOB",
        name: "Free On Board",
        group: "F",
        transport: "sea",
        description: "Seller loads goods onboard ship (sea).",
        riskTransfer: "Once goods are loaded onboard.",
        costAllocation: "Seller: Export + loading; Buyer: freight + import.",
        sellerResponsibilities: "Load on vessel, export clearance.",
        buyerResponsibilities: "Sea freight + insurance + import.",
        notes: "Not ideal for containers.",
        sellerRiskPercent: 25,
        buyerRiskPercent: 75
    },
    {
        code: "CFR",
        name: "Cost and Freight",
        group: "C",
        transport: "sea",
        description: "Seller pays freight to port; risk transfers at loading.",
        riskTransfer: "When goods are loaded on vessel.",
        costAllocation: "Seller: Freight; Buyer: Insurance + import.",
        sellerResponsibilities: "Ocean freight.",
        buyerResponsibilities: "Insurance + import.",
        notes: "Insurance not included.",
        sellerRiskPercent: 30,
        buyerRiskPercent: 70
    },
    {
        code: "CIF",
        name: "Cost, Insurance & Freight",
        group: "C",
        transport: "sea",
        description: "Same as CFR but seller must provide marine insurance.",
        riskTransfer: "When goods are onboard vessel.",
        costAllocation: "Seller: Freight + basic insurance; Buyer: import.",
        sellerResponsibilities: "Freight + insurance.",
        buyerResponsibilities: "Import formalities.",
        notes: "Used for commodities.",
        sellerRiskPercent: 40,
        buyerRiskPercent: 60
    }
];

// ===== INSURANCE MATRIX DATA =====
const inlandMatrix = [
    { incoterm: "EXW", itcA: "Recommended", itcB: "Acceptable", itcC: "Not recommended" },
    { incoterm: "FCA", itcA: "Recommended", itcB: "Acceptable", itcC: "Limited" },
    { incoterm: "CPT", itcA: "Recommended", itcB: "Acceptable", itcC: "Not preferred" },
    { incoterm: "CIP", itcA: "Recommended", itcB: "Acceptable", itcC: "Not preferred" },
    { incoterm: "DAP", itcA: "Recommended", itcB: "Limited", itcC: "Not recommended" },
    { incoterm: "DPU", itcA: "Recommended", itcB: "Limited", itcC: "Not recommended" },
    { incoterm: "DDP", itcA: "Recommended", itcB: "Limited", itcC: "Not recommended" },
    { incoterm: "FAS/FOB/CFR/CIF", itcA: "Recommended", itcB: "Acceptable", itcC: "Common" }
];

const marineMatrix = [
    { incoterm: "EXW", iccA: "Recommended", iccB: "Acceptable", iccC: "Not recommended" },
    { incoterm: "FCA", iccA: "Recommended", iccB: "Acceptable", iccC: "Limited" },
    { incoterm: "CPT", iccA: "Recommended", iccB: "Acceptable", iccC: "Limited" },
    { incoterm: "CIP", iccA: "Mandatory", iccB: "Not applicable", iccC: "Not applicable" },
    { incoterm: "DAP", iccA: "Recommended", iccB: "Acceptable", iccC: "Not recommended" },
    { incoterm: "DPU", iccA: "Recommended", iccB: "Acceptable", iccC: "Not recommended" },
    { incoterm: "DDP", iccA: "Recommended", iccB: "Acceptable", iccC: "Not recommended" },
    { incoterm: "FAS (Sea)", iccA: "Optional", iccB: "Acceptable", iccC: "Common" },
    { incoterm: "FOB (Sea)", iccA: "Optional", iccB: "Acceptable", iccC: "Very common" },
    { incoterm: "CFR (Sea)", iccA: "Optional", iccB: "Acceptable", iccC: "Common" },
    { incoterm: "CIF (Sea)", iccA: "Recommended", iccB: "Acceptable", iccC: "Rare" }
];

// ===== LEARNING MODULES =====
const lessons = [
    {
        id: 1,
        title: "What are Incoterms?",
        icon: "📦",
        content: `
            <h3>Introduction to Incoterms 2020</h3>
            <p><strong>Incoterms</strong> (International Commercial Terms) are a set of 11 rules published by the International Chamber of Commerce (ICC) that define the responsibilities of sellers and buyers in international trade.</p>
            <h4>Key Points:</h4>
            <ul>
                <li>They clarify <strong>who pays</strong> for transport, insurance, and duties</li>
                <li>They define <strong>where risk transfers</strong> from seller to buyer</li>
                <li>They do NOT determine ownership or payment terms</li>
                <li>Current version: <strong>Incoterms 2020</strong> (effective Jan 1, 2020)</li>
            </ul>
            <h4>Two Categories:</h4>
            <div class="lesson-highlight">
                <p><strong>Any Transport Mode (7 terms):</strong> EXW, FCA, CPT, CIP, DAP, DPU, DDP</p>
                <p><strong>Sea/Inland Waterway Only (4 terms):</strong> FAS, FOB, CFR, CIF</p>
            </div>
        `
    },
    {
        id: 2,
        title: "Risk vs Cost Transfer",
        icon: "⚖️",
        content: `
            <h3>Understanding Risk & Cost Split</h3>
            <p>A critical concept: <strong>risk transfer point ≠ cost responsibility</strong> in some Incoterms.</p>
            <h4>Example — CPT (Carriage Paid To):</h4>
            <div class="lesson-highlight">
                <p><strong>Risk transfers:</strong> When goods are handed to the first carrier (early!)</p>
                <p><strong>Cost paid by seller:</strong> All the way to the destination</p>
                <p>This means the buyer carries risk during transit even though the seller pays for freight.</p>
            </div>
            <h4>Terms where risk = cost point:</h4>
            <ul>
                <li>EXW — Both at seller's premises</li>
                <li>DAP — Both at destination</li>
                <li>DPU — Both after unloading</li>
                <li>DDP — Both at destination</li>
            </ul>
            <h4>Terms where risk ≠ cost point:</h4>
            <ul>
                <li>CPT, CIP — Risk at carrier, cost to destination</li>
                <li>CFR, CIF — Risk on board vessel, cost to port of destination</li>
            </ul>
        `
    },
    {
        id: 3,
        title: "Marine Insurance Clauses",
        icon: "🛡️",
        content: `
            <h3>Institute Cargo Clauses (ICC) & Institute Trade Clauses (ITC)</h3>
            <h4>For International Marine Transit — ICC:</h4>
            <ul>
                <li><strong>ICC (A) — All Risks:</strong> Covers all perils except specific exclusions. Broadest coverage.</li>
                <li><strong>ICC (B) — Named Perils:</strong> Covers listed perils like fire, explosion, stranding, sinking, collision, earthquake, lightning, washing overboard.</li>
                <li><strong>ICC (C) — Major Perils Only:</strong> Only covers major marine perils: sinking, grounding, fire, collision, jettison. Narrowest.</li>
            </ul>
            <h4>For Inland/Domestic Transit — ITC:</h4>
            <ul>
                <li><strong>ITC (A) — All Risks:</strong> Full inland transit coverage</li>
                <li><strong>ITC (B) — Limited Perils:</strong> Named perils for road/rail</li>
                <li><strong>ITC (C) — Major Perils Only:</strong> Bare minimum coverage</li>
            </ul>
            <div class="lesson-highlight">
                <p><strong>Key Rule:</strong> Under CIP, the seller MUST provide ICC (A) level insurance — this is mandatory per Incoterms 2020 rules.</p>
            </div>
        `
    },
    {
        id: 4,
        title: "Choosing the Right Incoterm",
        icon: "🧭",
        content: `
            <h3>Decision Framework</h3>
            <h4>Ask these questions:</h4>
            <ol>
                <li><strong>Transport mode?</strong> — Sea only → FAS/FOB/CFR/CIF available. Container → prefer FCA/CPT/CIP.</li>
                <li><strong>Who arranges freight?</strong> — Seller (C/D terms) or Buyer (E/F terms)?</li>
                <li><strong>Insurance responsibility?</strong> — CIP/CIF include insurance. Others don't.</li>
                <li><strong>Customs capability?</strong> — Can buyer handle export? If not, avoid EXW. Can seller handle import? If yes, consider DDP.</li>
            </ol>
            <h4>Common Scenarios:</h4>
            <div class="lesson-highlight">
                <p>🏭 <strong>Factory pickup:</strong> EXW</p>
                <p>📦 <strong>Container shipment:</strong> FCA (recommended over FOB)</p>
                <p>🚢 <strong>Bulk sea cargo:</strong> FOB or CIF</p>
                <p>🏠 <strong>Door-to-door delivery:</strong> DAP or DDP</p>
                <p>🔒 <strong>Maximum insurance:</strong> CIP (mandatory ICC A)</p>
            </div>
        `
    },
    {
        id: 5,
        title: "Insurance + Incoterms Matrix",
        icon: "📊",
        content: `
            <h3>Matching Insurance to Incoterms</h3>
            <p>The right insurance clause depends on the Incoterm and the transit leg (inland vs marine).</p>
            <h4>General Rules:</h4>
            <ul>
                <li><strong>D-terms (DAP, DPU, DDP):</strong> Seller bears long transit risk → ICC/ITC (A) recommended</li>
                <li><strong>F-terms (FCA, FAS, FOB):</strong> Buyer should insure from pickup/loading point</li>
                <li><strong>C-terms:</strong> Risk ≠ Cost point → insurance is critical for the buyer (except CIP/CIF where seller insures)</li>
                <li><strong>EXW:</strong> Buyer bears ALL risk → All Risks (A) coverage strongly recommended</li>
            </ul>
            <div class="lesson-highlight">
                <p><strong>CIP Special Rule:</strong> Seller must insure at ICC (A) — All Risks minimum. This is a legal requirement under Incoterms 2020.</p>
                <p><strong>CIF Note:</strong> Seller only needs to provide ICC (C) minimum, though ICC (A) is recommended.</p>
            </div>
        `
    },
    {
        id: 6,
        title: "ICC (A) — All Risks Coverage",
        icon: "🛡️",
        content: `
            <h3>Institute Cargo Clauses (A) — All Risks</h3>
            <p>ICC (A) is the <strong>broadest</strong> marine insurance coverage available. It covers all risks of loss or damage to cargo <strong>except</strong> specific exclusions.</p>
            <h4>✅ Risks Covered (All Risks means everything EXCEPT exclusions):</h4>
            <ul>
                <li>Fire, explosion</li>
                <li>Vessel sinking, capsizing, grounding, stranding</li>
                <li>Collision of vessel or craft</li>
                <li>Overturning or derailment of land conveyance</li>
                <li>Discharge of cargo at port of distress</li>
                <li>Earthquake, volcanic eruption, lightning</li>
                <li>Washing overboard, entry of sea/lake/river water</li>
                <li>Total loss of any package lost overboard or dropped during loading/unloading</li>
                <li><strong>Theft, pilferage, non-delivery</strong></li>
                <li><strong>Wetting, contamination, breakage, leakage</strong></li>
                <li><strong>Hook damage, denting, scratching</strong></li>
                <li><strong>Fresh/rain water damage</strong></li>
                <li><strong>Shortage, mixing with other cargo</strong></li>
                <li>General average and salvage charges</li>
            </ul>
            <h4>❌ Standard Exclusions (not covered even under A):</h4>
            <ul>
                <li>Wilful misconduct of the assured</li>
                <li>Ordinary leakage, loss in weight/volume, wear and tear</li>
                <li>Insufficiency of packing or preparation</li>
                <li>Inherent vice or nature of goods</li>
                <li>Delay (even if caused by an insured risk)</li>
                <li>Insolvency or financial default of owners/operators</li>
                <li>War, strikes, riots, civil commotion (covered by separate clauses if added)</li>
                <li>Nuclear/radioactive contamination</li>
            </ul>
            <div class="lesson-highlight">
                <p><strong>When to use ICC (A):</strong> High-value goods, fragile items, electronics, pharmaceuticals, perishables. Mandatory under CIP Incoterm. Recommended for EXW, DAP, DPU, DDP where one party bears long transit risk.</p>
            </div>
        `
    },
    {
        id: 7,
        title: "ICC (B) — Named Perils",
        icon: "🔶",
        content: `
            <h3>Institute Cargo Clauses (B) — Named Perils</h3>
            <p>ICC (B) provides <strong>intermediate coverage</strong>. Only specifically listed perils are covered — if it's not in the list, there's no claim.</p>
            <h4>✅ Risks Covered:</h4>
            <ul>
                <li>Fire or explosion</li>
                <li>Vessel/craft stranding, grounding, sinking, capsizing</li>
                <li>Overturning or derailment of land conveyance</li>
                <li>Collision or contact of vessel/craft/conveyance with external object (not water)</li>
                <li>Discharge of cargo at port of distress</li>
                <li>Earthquake, volcanic eruption, lightning</li>
                <li>Washing overboard</li>
                <li>Entry of sea, lake, or river water into vessel/craft/container</li>
                <li>Total loss of any package lost overboard or dropped during loading/unloading</li>
                <li>General average sacrifice</li>
                <li>Jettison (goods thrown overboard to save the vessel)</li>
            </ul>
            <h4>❌ NOT Covered (key gaps vs ICC A):</h4>
            <ul>
                <li><strong>Theft, pilferage, non-delivery</strong> — NOT covered!</li>
                <li><strong>Rain/fresh water damage</strong> — NOT covered!</li>
                <li><strong>Breakage, denting, scratching</strong> — NOT covered!</li>
                <li><strong>Wetting by sweat/condensation</strong> — NOT covered!</li>
                <li><strong>Contamination, hook damage</strong> — NOT covered!</li>
                <li>All standard exclusions from ICC (A) also apply</li>
            </ul>
            <div class="lesson-highlight">
                <p><strong>When to use ICC (B):</strong> Goods that are not easily stolen or damaged by water — e.g. raw materials, steel coils, timber. Acceptable for FOB, FAS, CFR sea shipments. Not suitable for high-value or fragile goods.</p>
            </div>
        `
    },
    {
        id: 8,
        title: "ICC (C) — Major Perils Only",
        icon: "⚠️",
        content: `
            <h3>Institute Cargo Clauses (C) — Major Perils Only</h3>
            <p>ICC (C) is the <strong>narrowest</strong> marine coverage. Only catastrophic events are covered.</p>
            <h4>✅ Risks Covered:</h4>
            <ul>
                <li>Fire or explosion</li>
                <li>Vessel/craft stranding, grounding, sinking, capsizing</li>
                <li>Overturning or derailment of land conveyance</li>
                <li>Collision or contact of vessel/craft with external object (not water)</li>
                <li>Discharge of cargo at port of distress</li>
                <li>General average sacrifice</li>
                <li>Jettison</li>
            </ul>
            <h4>❌ NOT Covered (critical gaps):</h4>
            <ul>
                <li><strong>Earthquake, volcanic eruption, lightning</strong> — NOT covered!</li>
                <li><strong>Washing overboard</strong> — NOT covered!</li>
                <li><strong>Entry of sea water into vessel</strong> — NOT covered!</li>
                <li><strong>Total loss of package during loading/unloading</strong> — NOT covered!</li>
                <li>Theft, pilferage, non-delivery — NOT covered</li>
                <li>Breakage, wetting, contamination — NOT covered</li>
                <li>All other perils not specifically listed — NOT covered</li>
            </ul>
            <div class="lesson-highlight">
                <p><strong>When to use ICC (C):</strong> Low-value bulk commodities (coal, ore, grains) where only catastrophic loss matters. This is the minimum insurance level required under CIF. Use for very resilient cargo that can withstand water/handling damage.</p>
                <p><strong>⚠️ Warning:</strong> ICC (C) leaves many common risks uncovered. Not recommended for D-terms, EXW, or any high-value cargo.</p>
            </div>
        `
    },
    {
        id: 9,
        title: "ITC (A) — Inland All Risks",
        icon: "🚛",
        content: `
            <h3>Institute Trade Clauses (A) — All Risks for Inland Transit</h3>
            <p>ITC (A) provides <strong>comprehensive coverage</strong> for goods moving by road, rail, or inland waterway within a country.</p>
            <h4>✅ Risks Covered:</h4>
            <ul>
                <li>All risks of physical loss or damage from any external cause</li>
                <li>Road traffic accidents — collision, overturning, jackknifing</li>
                <li>Fire and explosion during transit</li>
                <li>Theft of entire consignment or pilferage of part</li>
                <li>Water damage from rain, flood, river overflow</li>
                <li>Breakage, denting, scratching during handling</li>
                <li>Contamination or mixing with other goods</li>
                <li>Loading and unloading damage</li>
                <li>Bridge collapse, tunnel damage, landslide</li>
                <li>Derailment for rail transport</li>
                <li>Non-delivery of entire package</li>
                <li>Damage due to negligence of carrier</li>
            </ul>
            <h4>❌ Standard Exclusions:</h4>
            <ul>
                <li>Wilful misconduct of the insured</li>
                <li>Ordinary wear and tear, gradual deterioration</li>
                <li>Inherent vice (e.g. fruit rotting naturally)</li>
                <li>Insufficient or unsuitable packing</li>
                <li>Delay</li>
                <li>Loss of market</li>
                <li>War, strikes (unless added separately)</li>
            </ul>
            <div class="lesson-highlight">
                <p><strong>When to use ITC (A):</strong> Recommended for ALL inland movements under EXW, FCA, DAP, DPU, DDP. Essential for high-value goods, electronics, fragile items moving domestically. The default choice for Indian inland cargo.</p>
            </div>
        `
    },
    {
        id: 10,
        title: "ITC (B) & (C) — Limited Inland Coverage",
        icon: "🛤️",
        content: `
            <h3>ITC (B) — Limited Perils & ITC (C) — Major Perils for Inland Transit</h3>

            <h4>ITC (B) — Limited Named Perils:</h4>
            <p>Covers a specific list of inland perils — more than (C) but less than (A).</p>
            <ul>
                <li>✅ Fire and explosion</li>
                <li>✅ Overturning, derailment, collision of vehicle</li>
                <li>✅ Collapse of bridge, building, or tunnel</li>
                <li>✅ Flood, storm, cyclone, earthquake</li>
                <li>✅ Landslide, rockfall</li>
                <li>✅ Complete loss of package during loading/unloading</li>
                <li>❌ Theft and pilferage — NOT covered</li>
                <li>❌ Breakage, scratching, denting — NOT covered</li>
                <li>❌ Rain/water damage (unless flood) — NOT covered</li>
                <li>❌ Contamination — NOT covered</li>
            </ul>

            <h4>ITC (C) — Major Perils Only:</h4>
            <p>The most basic inland cover — only catastrophic incidents.</p>
            <ul>
                <li>✅ Fire and explosion</li>
                <li>✅ Overturning or derailment of carrying vehicle</li>
                <li>✅ Collision of carrying vehicle with external object</li>
                <li>❌ Natural disasters (flood, earthquake) — NOT covered</li>
                <li>❌ Theft — NOT covered</li>
                <li>❌ Loading/unloading damage — NOT covered</li>
                <li>❌ Water damage of any kind — NOT covered</li>
                <li>❌ All other perils — NOT covered</li>
            </ul>

            <div class="lesson-highlight">
                <p><strong>ITC (B):</strong> Acceptable for moderately valued, resilient goods on established routes. Common for FAS/FOB/CFR/CIF inland legs.</p>
                <p><strong>ITC (C):</strong> Only for very low-value, highly resilient cargo (bulk raw materials). Not recommended for most shipments — too many gaps.</p>
                <p><strong>Indian Context:</strong> Given road conditions, theft risk, and monsoon flooding in India, ITC (A) is strongly recommended for most domestic movements.</p>
            </div>
        `
    },
    {
        id: 11,
        title: "ICC vs ITC — Comparison Summary",
        icon: "📋",
        content: `
            <h3>Quick Comparison: ICC vs ITC Clauses</h3>
            <p>Understanding when to use international (ICC) vs domestic (ITC) clauses.</p>

            <h4>When to use ICC (International):</h4>
            <ul>
                <li>Goods crossing international borders</li>
                <li>Sea freight, air freight, multimodal international shipments</li>
                <li>Port-to-port or warehouse-to-warehouse across countries</li>
            </ul>

            <h4>When to use ITC (Domestic/Inland):</h4>
            <ul>
                <li>Goods moving within India (or any single country)</li>
                <li>Road, rail, or inland waterway transport</li>
                <li>Factory to port (pre-export leg) or port to warehouse (post-import leg)</li>
            </ul>

            <h4>Coverage Comparison at a Glance:</h4>
            <div class="lesson-highlight">
                <p><strong>All Risks:</strong> ICC (A) ≈ ITC (A) — Both cover everything except exclusions</p>
                <p><strong>Named Perils:</strong> ICC (B) ≈ ITC (B) — Both cover listed perils only (ICC B includes natural disasters, ITC B includes flood/cyclone)</p>
                <p><strong>Major Perils:</strong> ICC (C) ≈ ITC (C) — Both only cover fire, sinking/overturning, collision. Bare minimum.</p>
            </div>

            <h4>Key Differences:</h4>
            <ul>
                <li><strong>ICC (B) covers</strong> washing overboard & sea water entry — ITC (B) doesn't (no sea involved)</li>
                <li><strong>ITC (B) covers</strong> flood, cyclone, landslide — specific to inland risks</li>
                <li><strong>Duration:</strong> ICC covers warehouse-to-warehouse internationally; ITC covers origin-to-destination domestically</li>
                <li><strong>CIP rule:</strong> Only applies to ICC (A) — for international transit</li>
            </ul>

            <div class="lesson-highlight">
                <p><strong>💡 Best Practice for Indian Exporters/Importers:</strong></p>
                <p>Use <strong>ITC (A)</strong> for the inland leg (factory to port / port to warehouse)</p>
                <p>Use <strong>ICC (A)</strong> for the international leg (port to port)</p>
                <p>This gives end-to-end All Risks protection across the full journey.</p>
            </div>
        `
    }
];

// ===== QUIZ QUESTIONS =====
const quizQuestions = [
    {
        question: "Under which Incoterm does the seller have the MINIMUM obligation?",
        options: ["DDP", "EXW", "CIF", "FOB"],
        correct: 1,
        explanation: "EXW (Ex Works) places minimum obligation on the seller — they only need to make goods available at their premises."
    },
    {
        question: "When does risk transfer to the buyer under FOB?",
        options: ["At seller's warehouse", "When goods are alongside ship", "Once goods are loaded onboard the vessel", "At destination port"],
        correct: 2,
        explanation: "Under FOB, risk transfers once goods pass the ship's rail — i.e., when they are loaded onboard the vessel."
    },
    {
        question: "Which Incoterm REQUIRES the seller to provide ICC (A) All Risks insurance?",
        options: ["CIF", "FOB", "CIP", "DAP"],
        correct: 2,
        explanation: "CIP (Carriage & Insurance Paid To) mandates ICC (A) level coverage under Incoterms 2020 rules."
    },
    {
        question: "Which is the only Incoterm where the seller is responsible for unloading?",
        options: ["DAP", "DDP", "DPU", "FCA"],
        correct: 2,
        explanation: "DPU (Delivered at Place Unloaded) is the only term where the seller must unload the goods at destination."
    },
    {
        question: "For container cargo, which Incoterm is recommended over FOB?",
        options: ["CIF", "FCA", "EXW", "DDP"],
        correct: 1,
        explanation: "FCA is recommended for container cargo because risk transfer at 'first carrier' is clearer than 'on board vessel' for containerized goods."
    },
    {
        question: "Under CPT, where does RISK transfer vs where does the seller pay COST to?",
        options: ["Risk at destination, Cost at carrier", "Risk at carrier, Cost to destination", "Both at destination", "Both at carrier"],
        correct: 1,
        explanation: "CPT is a classic example of risk ≠ cost: risk transfers at the first carrier, but seller pays freight all the way to destination."
    },
    {
        question: "Under CIF, what minimum insurance level must the seller provide?",
        options: ["ICC (A) - All Risks", "ICC (B) - Named Perils", "ICC (C) - Major Perils", "No insurance required"],
        correct: 2,
        explanation: "Under CIF, the seller only needs to provide minimum ICC (C) coverage, unlike CIP which requires ICC (A)."
    },
    {
        question: "Which Incoterms are restricted to SEA transport only?",
        options: ["EXW, FCA, CPT, CIP", "FAS, FOB, CFR, CIF", "DAP, DPU, DDP", "All of the above"],
        correct: 1,
        explanation: "FAS, FOB, CFR, and CIF are exclusively for sea and inland waterway transport."
    },
    {
        question: "Under DDP, who is responsible for import duties?",
        options: ["Buyer", "Seller", "Shared equally", "The shipping carrier"],
        correct: 1,
        explanation: "DDP (Delivered Duty Paid) means the seller handles everything including import duties — maximum seller responsibility."
    },
    {
        question: "What type of insurance is recommended for EXW when buyer handles full inland journey?",
        options: ["ITC (C) - Major Perils Only", "No insurance needed", "ITC (A) - All Risks", "ITC (B) - Limited Perils"],
        correct: 2,
        explanation: "Since the buyer handles the entire journey under EXW, ITC (A) All Risks is recommended for maximum inland transit protection."
    },
    {
        question: "Where does risk transfer under FAS?",
        options: ["On board the vessel", "At seller's warehouse", "Alongside the ship", "At destination"],
        correct: 2,
        explanation: "FAS (Free Alongside Ship) — risk transfers when goods are placed alongside the vessel at the port of shipment."
    },
    {
        question: "Which Group D term does NOT require the seller to clear import customs?",
        options: ["DDP", "DAP", "All D terms require import clearance", "DPU"],
        correct: 1,
        explanation: "DAP (Delivered at Place) — the seller delivers goods ready for unloading but the buyer handles import clearance and duties."
    },
    {
        question: "What distinguishes CFR from CIF?",
        options: ["CFR is for air; CIF is for sea", "CIF includes seller-arranged insurance; CFR does not", "CFR includes import duties", "There is no difference"],
        correct: 1,
        explanation: "CIF = CFR + Insurance. Under CFR, the seller pays freight but NOT insurance. Under CIF, the seller also provides marine insurance."
    },
    {
        question: "For bulk sea cargo, which Incoterm is most appropriate?",
        options: ["FCA", "EXW", "FAS", "CIP"],
        correct: 2,
        explanation: "FAS (Free Alongside Ship) is specifically designed for bulk cargo that is loaded alongside the vessel."
    },
    {
        question: "Under which Incoterm does risk transfer at the SAME point as cost responsibility for the seller?",
        options: ["CPT", "CIF", "DAP", "CFR"],
        correct: 2,
        explanation: "DAP — risk and cost both transfer at the destination (when goods arrive ready for unloading). CPT, CIF, and CFR have split risk/cost points."
    }
];


// ===== INCOTERMS VISUAL STORIES =====
const incotermStories = {
    EXW: {
        title: "EXW — Ex Works",
        subtitle: "The seller's only job: make the goods available at their door.",
        vehicle: "📦",
        riskTransferPercent: 5,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "active" },
            { icon: "🚛", label: "Local Transport", zone: "buyer" },
            { icon: "🛃", label: "Export Customs", zone: "buyer" },
            { icon: "🚢", label: "Sea Freight", zone: "buyer" },
            { icon: "🏪", label: "Buyer's Door", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller places the goods at their warehouse or factory. That's it — job done!" },
            { type: "risk", text: "Risk transfers immediately — the moment goods are available at seller's premises, all risk shifts to the buyer." },
            { type: "buyer", text: "The buyer arranges pickup, local transport, export clearance, international freight, import clearance — everything." },
            { type: "buyer", text: "The buyer also handles all insurance, since they bear risk from the very first moment." },
            { type: "info", text: "Best for: When the buyer has strong logistics capabilities and wants full control over the shipping process." }
        ]
    },
    FCA: {
        title: "FCA — Free Carrier",
        subtitle: "Seller delivers to the buyer's carrier — then risk switches.",
        vehicle: "🚛",
        riskTransferPercent: 20,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "📋", label: "Export Customs", zone: "seller" },
            { icon: "🚛", label: "First Carrier", zone: "active" },
            { icon: "🚢", label: "Main Freight", zone: "buyer" },
            { icon: "🏪", label: "Buyer's Door", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller prepares the goods at their facility and handles export customs clearance." },
            { type: "seller", text: "The seller delivers the goods to the first carrier (truck, rail, or freight forwarder) at the agreed place." },
            { type: "risk", text: "Risk transfers the moment goods are handed to the first carrier. This is the critical handoff point!" },
            { type: "buyer", text: "From here, the buyer arranges and pays for the main international freight, insurance, and import clearance." },
            { type: "info", text: "Best for: Container cargo! FCA is recommended over FOB for containerized shipments because the handover point is clearer." }
        ]
    },
    FOB: {
        title: "FOB — Free On Board",
        subtitle: "Seller loads goods onto the ship — risk passes over the rail.",
        vehicle: "🚢",
        riskTransferPercent: 30,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "🚛", label: "To Port", zone: "seller" },
            { icon: "⚓", label: "Loaded On Ship", zone: "active" },
            { icon: "🌊", label: "Sea Voyage", zone: "buyer" },
            { icon: "🏪", label: "Buyer's Port", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller transports goods from the factory to the port of shipment and handles export clearance." },
            { type: "seller", text: "The seller loads the cargo onto the buyer's nominated vessel. Loading costs are on the seller." },
            { type: "risk", text: "Risk transfers once goods are loaded onboard the vessel — they pass the ship's rail." },
            { type: "buyer", text: "The buyer pays for sea freight, marine insurance, and handles import at destination." },
            { type: "info", text: "Note: FOB is sea-only. Not ideal for containers (use FCA instead). Great for bulk cargo like grain, coal, or oil." }
        ]
    },
    CIF: {
        title: "CIF — Cost, Insurance & Freight",
        subtitle: "Seller pays freight + insurance, but risk still transfers at loading.",
        vehicle: "🚢",
        riskTransferPercent: 30,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "⚓", label: "Loaded On Ship", zone: "active" },
            { icon: "🛡️", label: "Insurance (Seller)", zone: "seller" },
            { icon: "🌊", label: "Sea Voyage", zone: "buyer" },
            { icon: "🏪", label: "Dest. Port", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller arranges everything to get goods on board: transport to port, export customs, and loading." },
            { type: "risk", text: "Risk transfers once goods are loaded onboard — same as FOB! Even though seller pays further costs." },
            { type: "seller", text: "The seller MUST provide marine insurance (minimum ICC-C level) and pays ocean freight to the destination port." },
            { type: "buyer", text: "The buyer bears the actual transit risk (despite seller paying). Buyer handles import clearance and duties." },
            { type: "info", text: "Key insight: Cost ≠ Risk! Seller pays freight + insurance, but if cargo is lost at sea, the buyer claims insurance. Very common for commodities." }
        ]
    },
    CIP: {
        title: "CIP — Carriage & Insurance Paid To",
        subtitle: "Like CIF but for any transport — and seller MUST provide All Risks insurance.",
        vehicle: "✈️",
        riskTransferPercent: 25,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "🚛", label: "First Carrier", zone: "active" },
            { icon: "🛡️", label: "ICC(A) Insurance", zone: "seller" },
            { icon: "✈️", label: "Main Transit", zone: "buyer" },
            { icon: "🏪", label: "Destination", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller delivers goods to the first carrier and arranges the main carriage to the destination." },
            { type: "risk", text: "Risk transfers at the first carrier handover — same as CPT. But there's a big insurance difference!" },
            { type: "seller", text: "The seller MUST insure cargo at ICC (A) — All Risks level. This is mandatory under Incoterms 2020!" },
            { type: "buyer", text: "The buyer bears transit risk from carrier onwards but is protected by the seller's mandatory All Risks insurance." },
            { type: "info", text: "Key difference from CIF: CIP requires ICC(A) All Risks insurance, while CIF only requires minimum ICC(C). CIP works for any transport mode." }
        ]
    },
    CPT: {
        title: "CPT — Carriage Paid To",
        subtitle: "Seller pays freight to destination, but risk passes much earlier.",
        vehicle: "🚛",
        riskTransferPercent: 25,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "🚛", label: "First Carrier", zone: "active" },
            { icon: "✈️", label: "Main Transit", zone: "buyer" },
            { icon: "📍", label: "Destination", zone: "buyer" },
            { icon: "🏪", label: "Buyer Receives", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller arranges and pays for transport all the way to the named destination." },
            { type: "risk", text: "But risk transfers early! As soon as goods are handed to the first carrier, risk moves to buyer." },
            { type: "buyer", text: "The buyer carries all risk during the main transit — even though the seller is paying for the freight!" },
            { type: "buyer", text: "The buyer should arrange their own insurance since they bear risk but seller isn't obligated to insure." },
            { type: "info", text: "Classic 'risk ≠ cost' example. The seller's wallet extends further than their responsibility. Buyer: get insurance!" }
        ]
    },
    DAP: {
        title: "DAP — Delivered at Place",
        subtitle: "Seller delivers goods right to the buyer's door — ready for unloading.",
        vehicle: "🚚",
        riskTransferPercent: 80,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "🛃", label: "Export", zone: "seller" },
            { icon: "🚢", label: "Main Transit", zone: "seller" },
            { icon: "📍", label: "Destination", zone: "active" },
            { icon: "🏪", label: "Unloading", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller handles the entire journey: factory pickup, export clearance, international freight, to destination." },
            { type: "seller", text: "The seller bears all risk and cost throughout the entire transit until arrival at the named place." },
            { type: "risk", text: "Risk transfers when goods arrive at the destination, placed at the buyer's disposal, ready for unloading." },
            { type: "buyer", text: "The buyer only needs to handle unloading, import customs clearance, and pay import duties." },
            { type: "info", text: "Great for: Door-to-door delivery where buyer can't handle complex logistics. Seller does almost everything except import customs." }
        ]
    },
    DPU: {
        title: "DPU — Delivered at Place Unloaded",
        subtitle: "The ONLY Incoterm where seller must unload the goods at destination.",
        vehicle: "🏗️",
        riskTransferPercent: 88,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "🚢", label: "Full Transit", zone: "seller" },
            { icon: "📍", label: "Destination", zone: "seller" },
            { icon: "🏗️", label: "Unloaded!", zone: "active" },
            { icon: "🏪", label: "Import", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller arranges and pays for everything: factory to destination including all transit." },
            { type: "seller", text: "The seller also physically UNLOADS the goods at the destination. This is unique to DPU!" },
            { type: "risk", text: "Risk only transfers AFTER the goods are unloaded at the destination terminal or place." },
            { type: "buyer", text: "The buyer takes over after unloading — only import clearance and duties remain." },
            { type: "info", text: "Remember: DPU = the only term where seller unloads. Previously called DAT (Delivered at Terminal). Renamed in 2020." }
        ]
    },
    DDP: {
        title: "DDP — Delivered Duty Paid",
        subtitle: "Maximum seller obligation — seller handles absolutely everything including import duties.",
        vehicle: "🎁",
        riskTransferPercent: 95,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "🚢", label: "Full Transit", zone: "seller" },
            { icon: "🛃", label: "Import Cleared", zone: "seller" },
            { icon: "💰", label: "Duties Paid", zone: "seller" },
            { icon: "🏪", label: "Buyer's Door", zone: "active" }
        ],
        narration: [
            { type: "seller", text: "The seller handles EVERYTHING: export, international freight, import clearance, AND pays import duties/taxes." },
            { type: "seller", text: "All costs from factory to buyer's premises are on the seller — transport, insurance, customs, duties." },
            { type: "risk", text: "Risk transfers only at the very end — when goods arrive at buyer's door, ready for unloading." },
            { type: "buyer", text: "The buyer's only job: unload the goods. That's it. Maximum convenience for the buyer." },
            { type: "info", text: "Opposite of EXW! Highest seller obligation. Seller must be registered for import VAT/duties in buyer's country." }
        ]
    },
    FAS: {
        title: "FAS — Free Alongside Ship",
        subtitle: "Seller places goods next to the vessel at port — sea cargo only.",
        vehicle: "📦",
        riskTransferPercent: 18,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "🚛", label: "To Port", zone: "seller" },
            { icon: "⚓", label: "Alongside Ship", zone: "active" },
            { icon: "🚢", label: "Loading + Voyage", zone: "buyer" },
            { icon: "🏪", label: "Buyer's Port", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller transports goods from factory to the port and delivers them alongside the nominated vessel (on the quay)." },
            { type: "seller", text: "Export clearance is handled by the seller. The goods sit on the dock, next to the ship." },
            { type: "risk", text: "Risk transfers the moment goods are placed alongside the vessel — not loaded on it, just next to it." },
            { type: "buyer", text: "The buyer is responsible for loading onto the ship, all sea freight, insurance, and import procedures." },
            { type: "info", text: "Sea-only term. Ideal for bulk cargo (grain, minerals, timber) that's loaded by crane or conveyor alongside the ship." }
        ]
    },
    CFR: {
        title: "CFR — Cost and Freight",
        subtitle: "Seller pays freight to destination port, but risk passes at loading.",
        vehicle: "🚢",
        riskTransferPercent: 30,
        stops: [
            { icon: "🏭", label: "Seller's Factory", zone: "seller" },
            { icon: "⚓", label: "Loaded On Ship", zone: "active" },
            { icon: "🌊", label: "Sea Voyage", zone: "buyer" },
            { icon: "🏪", label: "Dest. Port", zone: "buyer" },
            { icon: "🛃", label: "Import", zone: "buyer" }
        ],
        narration: [
            { type: "seller", text: "The seller delivers goods on board the vessel and pays the ocean freight to the destination port." },
            { type: "risk", text: "Risk transfers once goods are loaded onboard — same point as FOB, even though seller pays more." },
            { type: "buyer", text: "The buyer bears transit risk from loading onwards. No insurance is provided by the seller!" },
            { type: "buyer", text: "The buyer must arrange their own marine insurance, plus handle import clearance and duties." },
            { type: "info", text: "Like CIF minus insurance. The 'Cost' in CFR = freight only. Buyer beware: you carry the sea voyage risk — insure yourself!" }
        ]
    }
};
