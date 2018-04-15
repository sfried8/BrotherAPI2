const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const md5 = require("blueimp-md5");
const app = express();
app.use(cors());
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
app.get("/authenticate", function(req, res) {
    if (md5(req.query.password) === "afbaceed96a3d7dadc67c99dafb436ff") {
        res.status(200).json({ role: "BROTHER" });
    } else if (md5(req.query.password) === "9543af88d9e1633240dc1754b3781863") {
        res.status(200).json({ role: "HISTOR" });
    } else if (req.query.password) {
        res.status(403).json({ role: "GUEST", error: "Invalid Password" });
    } else {
        res.status(400).json({ role: "GUEST", error: "No Password Provided" });
    }
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
            res.status(500).json({ error: "Could not get brother" });
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
            res.status(400).json({ error: "Brother not found" });
        }
    });
});
app.get("/brothers", function(req, res) {
    if (md5(req.query.password) === "afbaceed96a3d7dadc67c99dafb436ff") {
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
    } else {
        res.status(403).json({ error: "Invalid password" });
    }
});
// Create Brother endpoint
app.post("/brothers/add", function(req, res) {
    let {
        password,
        scroll,
        fname,
        lname,
        pc,
        nickname,
        bigS,
        active
    } = req.body;
    // if (typeof scroll !== "string") {
    //     res.status(400).json({ error: '"scroll" must be a string' });
    // } else if (typeof name !== "string") {
    //     res.status(400).json({ error: '"name" must be a string' });
    // }
    if (md5(password) === "9543af88d9e1633240dc1754b3781863") {
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
                res.status(500).json({ error: "Could not create brother" });
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
    } else {
        res.status(403).json({ error: "Invalid password" });
    }
});
app.post("/brothers/addOfficer", function(req, res) {
    let { password, current, title } = req.body;
    if (md5(password) === "9543af88d9e1633240dc1754b3781863") {
        const params = {
            TableName: OFFICERS_TABLE,
            Item: { title: title, current: current }
        };

        dynamoDb.put(params, error => {
            if (error) {
                console.log(error);
                res.status(500).json({ error: "Could not create officer" });
            }
            res.json({ title, current });
        });
    } else {
        res.status(403).json({ error: "Invalid password" });
    }
});
module.exports.handler = serverless(app);
