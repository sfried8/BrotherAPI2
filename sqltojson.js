const SqliteJsonExport = require("sqlite-json-export");
let exporter = new SqliteJsonExport("./development.db");
// exporter.tables((err, tables) => {
//     console.log(tables);
// });
exporter.save("brothers_brother", "output.json", (err, data) => {
    console.log(err);
    console.log(data);
});
