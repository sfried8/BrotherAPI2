const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const AWS = require("aws-sdk");

const BROTHERS_TABLE = process.env.BROTHERS_TABLE;

const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === "true") {
    dynamoDb = new AWS.DynamoDB.DocumentClient({
        region: "localhost",
        endpoint: "http://localhost:8000"
    });
    console.log(dynamoDb);
} else {
    dynamoDb = new AWS.DynamoDB.DocumentClient();
}
app.use(bodyParser.json({ strict: false }));

app.get("/", function(req, res) {
    res.send("Welcome!");
});

// Get Brother endpoint
app.get("/brothers/:scroll", function(req, res) {
    const params = {
        TableName: BROTHERS_TABLE,
        Key: {
            scroll: req.params.scroll
        }
    };

    dynamoDb.get(params, (error, result) => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: "Could not get brother" });
        }
        if (result.Item) {
            const { scroll, name } = result.Item;
            res.json({ scroll, name });
        } else {
            res.status(404).json({ error: "Brother not found" });
        }
    });
});

// Create Brother endpoint
app.post("/brothers", function(req, res) {
    const { scroll, name } = req.body;
    if (typeof scroll !== "string") {
        res.status(400).json({ error: '"scroll" must be a string' });
    } else if (typeof name !== "string") {
        res.status(400).json({ error: '"name" must be a string' });
    }

    const params = {
        TableName: BROTHERS_TABLE,
        Item: {
            scroll: scroll,
            name: name
        }
    };

    dynamoDb.put(params, error => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: "Could not create brother" });
        }
        res.json({ scroll, name });
    });
});

module.exports.handler = serverless(app);
