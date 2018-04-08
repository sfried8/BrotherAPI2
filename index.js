const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const AWS = require("aws-sdk");

const BROTHERS_TABLE = process.env.BROTHERS_TABLE;
const OFFICERS_TABLE = process.env.OFFICERS_TABLE;

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
            const {
                scroll,
                fname,
                lname,
                pc,
                nickname,
                big,
                active,
                isZetaTau
            } = result.Item;
            res.json({
                scroll,
                fname,
                lname,
                pc,
                nickname,
                big,
                active,
                isZetaTau
            });
        } else {
            res.status(404).json({ error: "Brother not found" });
        }
    });
});
app.get("/brothers", function(req, res) {
    // if (typeof scroll !== "string") {
    //     res.status(400).json({ error: '"scroll" must be a string' });
    // } else if (typeof name !== "string") {
    //     res.status(400).json({ error: '"name" must be a string' });
    // }

    const params = {
        TableName: BROTHERS_TABLE
    };

    dynamoDb.scan(params, (error, result) => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: "Could not get brothers" });
        } else {
            const params2 = { TableName: OFFICERS_TABLE };

            dynamoDb.scan(params2, (error2, result2) => {
                if (error2) {
                    console.log(error2);
                    res.status(400).json({
                        error: "Could not get brothers"
                    });
                } else {
                    res.json({
                        brothers: result.Items,
                        officers: result2.Items
                    });
                }
            });
        }
    });
});
// Create Brother endpoint
app.post("/brothers/add", function(req, res) {
    let { scroll, fname, lname, pc, nickname, bigS, active } = req.body;
    // if (typeof scroll !== "string") {
    //     res.status(400).json({ error: '"scroll" must be a string' });
    // } else if (typeof name !== "string") {
    //     res.status(400).json({ error: '"name" must be a string' });
    // }
    let isZetaTau = false;
    if (pc < 0) {
        pc *= -1;
        isZetaTau = true;
    }
    const params = {
        TableName: BROTHERS_TABLE,
        Item: {
            scroll: scroll,
            fname: fname,
            lname: lname,
            pc: pc,
            isZetaTau: isZetaTau,
            nickname: nickname,
            big: bigS,
            active: active
        }
    };

    dynamoDb.put(params, error => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: "Could not create brother" });
        }
        res.json({
            scroll,
            fname,
            lname,
            pc,
            nickname,
            bigS,
            active,
            isZetaTau
        });
    });
});
app.post("/brothers/addOfficer", function(req, res) {
    let { current, title } = req.body;
    const params = {
        TableName: OFFICERS_TABLE,
        Item: {
            title: title,
            current: current
        }
    };

    dynamoDb.put(params, error => {
        if (error) {
            console.log(error);
            res.status(400).json({ error: "Could not create officer" });
        }
        res.json({
            title,
            current
        });
    });
});
module.exports.handler = serverless(app);
