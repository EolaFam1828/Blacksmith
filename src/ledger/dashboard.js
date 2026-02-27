import fs from "node:fs/promises";
import { getSpendReport } from "./reporter.js";
import { getBlacksmithPath } from "../utils/paths.js";

const renderHtml = (payload) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Blacksmith Spend Dashboard</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <style>
      body { font-family: Georgia, serif; margin: 0; background: linear-gradient(135deg,#f5efe2,#d7e4f2); color: #1c1c1c; }
      #root { max-width: 980px; margin: 0 auto; padding: 40px 24px 64px; }
      .card { background: rgba(255,255,255,0.78); backdrop-filter: blur(8px); border: 1px solid rgba(0,0,0,0.08); border-radius: 20px; padding: 20px; margin-bottom: 20px; }
      h1,h2 { margin: 0 0 12px; }
      table { width: 100%; border-collapse: collapse; }
      th,td { text-align: left; padding: 10px 8px; border-bottom: 1px solid rgba(0,0,0,0.08); }
      .metric { font-size: 2rem; font-weight: 700; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      const data = ${JSON.stringify(payload)};
      const e = React.createElement;
      function App() {
        return e("div", null,
          e("div", { className: "card" },
            e("h1", null, "Blacksmith Spend Dashboard"),
            e("div", { className: "metric" }, "$" + (data.summary.total_cost || 0)),
            e("p", null, "Total estimated spend across ", data.summary.calls || 0, " calls.")
          ),
          ["backend","workflow","department"].map((key) =>
            e("div", { className: "card", key },
              e("h2", null, key[0].toUpperCase() + key.slice(1) + " Breakdown"),
              e("table", null,
                e("thead", null, e("tr", null, e("th", null, key), e("th", null, "Cost"), e("th", null, "Calls"))),
                e("tbody", null,
                  (data[key] || []).map((row, index) =>
                    e("tr", { key: index },
                      e("td", null, row[key] ?? "(none)"),
                      e("td", null, "$" + (row.total_cost || 0)),
                      e("td", null, row.calls || 0)
                    )
                  )
                )
              )
            )
          )
        );
      }
      ReactDOM.createRoot(document.getElementById("root")).render(e(App));
    </script>
  </body>
</html>`;

export const generateSpendDashboard = async (outPath) => {
  const payload = {
    summary: await getSpendReport(),
    backend: await getSpendReport({ byBackend: true }),
    workflow: await getSpendReport({ byWorkflow: true }),
    department: await getSpendReport({ byDepartment: true })
  };
  const target = outPath || getBlacksmithPath("reports", "spend-dashboard.html");
  await fs.writeFile(target, renderHtml(payload), "utf8");
  return target;
};
