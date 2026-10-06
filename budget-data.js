// King Family Dash — budget line structure.
// Monthly amounts here are zero. The lived-in case-study figures are loaded
// by supabase/kingfamily_seed.sql. If the budget table is still empty when an
// editor opens the page, the app inserts these zero rows as a blank sheet.

export const BUDGET_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const BUDGET_STRUCTURE = [
  {
    "kind": "group",
    "label": "Revenue (Goal)"
  },
  {
    "kind": "input",
    "key": "total_sales",
    "label": "Total Sales",
    "sign": 1,
    "autoActual": true,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "group",
    "label": "COGS"
  },
  {
    "kind": "input",
    "key": "total_cogs",
    "label": "Total COGS",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "group",
    "label": "Salaries"
  },
  {
    "kind": "input",
    "key": "payroll_my",
    "label": "Payroll (Malaysia)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "payroll_sg",
    "label": "Payroll (second office)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "epf_cpf",
    "label": "EPF/CPF (yer)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "socso",
    "label": "Socso (yer)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "eis",
    "label": "EIS (yer)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sdl_sg",
    "label": "SDL (second office)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "incentive",
    "label": "INCENTIVE",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "subtotal",
    "key": "total_salaries",
    "label": "Total Salaries",
    "sign": -1,
    "members": [
      "payroll_my",
      "payroll_sg",
      "epf_cpf",
      "socso",
      "eis",
      "sdl_sg",
      "incentive"
    ]
  },
  {
    "kind": "group",
    "label": "Expenses"
  },
  {
    "kind": "sub",
    "label": "Fixed"
  },
  {
    "kind": "input",
    "key": "rental",
    "label": "Rental Expenses",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sinking_fund",
    "label": "Sinking Fund",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "maintenance",
    "label": "Maintenance Service Charge",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "delivery",
    "label": "Delivery/Transport Charges (Grab + courier)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "samples",
    "label": "Samples Purchase",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "company_trip",
    "label": "Company Trip, Overseas Trip, Culture",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sponsorships",
    "label": "Sponsorships & Others",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "team_bonus",
    "label": "Team Bonus",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "entertainment",
    "label": "Entertainment",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "sub",
    "label": "Utilities"
  },
  {
    "kind": "input",
    "key": "util_electric",
    "label": "Electricity",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "util_water",
    "label": "Water",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "util_internet",
    "label": "Internet",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "util_phone",
    "label": "Household phone bill",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "sub",
    "label": "Fun & Lifestyle Spending"
  },
  {
    "kind": "input",
    "key": "off_stationery",
    "label": "Stationery, Printing, Paper Items",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "off_pantry",
    "label": "Pantry & Cleaning Items",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "off_it",
    "label": "IT Supplies",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "off_furniture",
    "label": "Furniture and Fittings",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "sub",
    "label": "Professional Services"
  },
  {
    "kind": "input",
    "key": "fin_perfectaim",
    "label": "Finance team retainer",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "fin_sg",
    "label": "Finance Team (SG)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "secretary",
    "label": "Secretary Fee",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "cosec_sg",
    "label": "Co Sec (SG)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "filing",
    "label": "Filing Fee",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "tax_agent",
    "label": "Tax Agent Fee",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "audit",
    "label": "Audit Fee",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "stripe",
    "label": "Stripe Fee",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "digital_mkt",
    "label": "Digital Marketing",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "ads_spend",
    "label": "Ads Spend",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "mkt_materials",
    "label": "Marketing Materials",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "tech_dev",
    "label": "Tech & Developer Team",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "cleaning",
    "label": "Studio cleaning",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "misc_prof",
    "label": "Miscellaneous (spending, helpers, subs, etc)",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "sub",
    "label": "Subscriptions"
  },
  {
    "kind": "input",
    "key": "sub_google",
    "label": "Google Workspace",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sub_chatgpt",
    "label": "ChatGPT",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sub_octopus",
    "label": "Email Octopus",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sub_canva",
    "label": "Canva",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sub_other",
    "label": "Other Subscriptions",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sub_hosting",
    "label": "Website hosting",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sub_systeme",
    "label": "Systeme.io",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "sub_misc",
    "label": "Miscellaneous Subscription",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "sub",
    "label": "Vehicle Upkeep & Maintenance"
  },
  {
    "kind": "input",
    "key": "veh_insurance",
    "label": "Motor Insurance",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "veh_service",
    "label": "Car Service",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "subtotal",
    "key": "total_expenses",
    "label": "Total Expenses",
    "members": [
      "rental",
      "sinking_fund",
      "maintenance",
      "delivery",
      "samples",
      "company_trip",
      "sponsorships",
      "team_bonus",
      "entertainment",
      "fin_perfectaim",
      "fin_sg",
      "secretary",
      "cosec_sg",
      "filing",
      "tax_agent",
      "audit",
      "stripe",
      "digital_mkt",
      "ads_spend",
      "mkt_materials",
      "tech_dev",
      "cleaning",
      "misc_prof",
      "sub_google",
      "sub_chatgpt",
      "sub_octopus",
      "sub_canva",
      "sub_other",
      "sub_hosting",
      "sub_systeme",
      "sub_misc",
      "util_electric",
      "util_water",
      "util_internet",
      "util_phone",
      "off_stationery",
      "off_pantry",
      "off_it",
      "off_furniture",
      "veh_insurance",
      "veh_service"
    ],
    "sign": -1
  },
  {
    "kind": "subtotal",
    "key": "total_opex",
    "label": "Total Operating Expenses",
    "members": [
      "total_salaries",
      "total_expenses"
    ],
    "sign": -1,
    "emphasis": true
  },
  {
    "kind": "group",
    "label": "Below the line"
  },
  {
    "kind": "input",
    "key": "depreciation",
    "label": "Depreciation *",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "sub",
    "label": "Loans"
  },
  {
    "kind": "input",
    "key": "loan_proton",
    "label": "Car loan — runabout",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "loan_denza",
    "label": "Car loan — family van",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "input",
    "key": "loan_maybank",
    "label": "Bank term loan",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "subtotal",
    "key": "total_loans",
    "label": "Total Loans",
    "members": [
      "loan_proton",
      "loan_denza",
      "loan_maybank"
    ],
    "sign": -1
  },
  {
    "kind": "input",
    "key": "cp204",
    "label": "CP204 Tax Installment *",
    "sign": -1,
    "budget": 0,
    "actuals": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  },
  {
    "kind": "net",
    "key": "net_profit",
    "label": "Net Profit Before Tax",
    "income": [
      "total_sales"
    ],
    "deduct": [
      "total_cogs",
      "total_opex",
      "depreciation",
      "total_loans",
      "cp204"
    ]
  },
  {
    "kind": "npm",
    "key": "npm",
    "label": "Net Profit Margin %",
    "net": "net_profit",
    "base": "total_sales"
  }
];

// Which section a newly added custom line rolls up into.
export const BUDGET_SECTIONS = [
  {
    "label": "Salaries",
    "subtotal": "total_salaries"
  },
  {
    "label": "Fixed",
    "subtotal": "total_expenses"
  },
  {
    "label": "Utilities",
    "subtotal": "total_expenses"
  },
  {
    "label": "Fun & Lifestyle Spending",
    "subtotal": "total_expenses"
  },
  {
    "label": "Professional Services",
    "subtotal": "total_expenses"
  },
  {
    "label": "Subscriptions",
    "subtotal": "total_expenses"
  },
  {
    "label": "Vehicle Upkeep & Maintenance",
    "subtotal": "total_expenses"
  },
  {
    "label": "Loans",
    "subtotal": "total_loans"
  }
];

export const sectionSubtotal = Object.fromEntries(BUDGET_SECTIONS.map((s) => [s.label, s.subtotal]));

export const labelByKey = Object.fromEntries(
  BUDGET_STRUCTURE.filter((line) => line.key).map((line) => [line.key, line.label])
);
