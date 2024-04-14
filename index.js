const serverless = require("serverless-http");
const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const app = express();
app.use(cors());
const AWS = require("aws-sdk");

const ROLES = {
    BROTHER: "BROTHER",
    HISTOR: "HISTOR",
    GUEST: "GUEST"
}

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

app.get("/", function (req, res) {
    res.send("Welcome!");
});
const brotherHash = "$2b$08$e7Bp9DYQskwI7PdNPBm4ZuvbLURxihuy3/so/Ks/qL068aNWg6yg2"
const historHash = "$2b$08$Jtd8elGLvPEIN4sNSgAh9OiuqLGZMm3qRuWEj/D.rwIPHKFR5Z1se"
function keyToRole(key) {
    if (bcrypt.compareSync(key, brotherHash)) {
        return ROLES.BROTHER
    } else if (bcrypt.compareSync(key, historHash)) {
        return ROLES.HISTOR
    }
    return ROLES.GUEST
}
function reqToRole(req) {
    const auth = req.get("authorization")
    if (!auth || !auth.startsWith("key=")) {
        return ROLES.GUEST
    }
    return keyToRole(auth.slice(4))
}
app.use(function (req, res, next) {
    const auth = req.get("authorization")
    if (!auth || !auth.startsWith("key=")) {
        return res.status(403).json({ error: 'No credentials sent!' });
    } else {
        const role = keyToRole(auth.slice(4));
        if (role === ROLES.GUEST) {
            return res.status(403).json({ error: 'Invalid credentials' });
        }
    }
    next();
});
app.get("/authenticate", function (req, res) {
    const role = reqToRole(req)
    res.status(200).json({ role: role });

});

app.get("/brothers", function (req, res) {
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
app.post("/brothers/add", function (req, res) {
    let {
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
    if (reqToRole(req) === ROLES.HISTOR) {
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
        res.status(403).json({ error: "Insufficient Priviledges" });
    }
});

app.delete("/brothers/delete", function (req, res) {
    let {
        scroll
    } = req.body;
    console.log("SCROLL IS " + scroll)
    if (reqToRole(req) === ROLES.HISTOR) {

        const params = {
            TableName: BROTHERS_TABLE,
            Key: {
                scroll
            }
        };

        dynamoDb.delete(params, error => {
            if (error) {
                console.log(error);
                res.status(500).json({ error: "Could not delete brother" });
            } else {

                res.status(200).json({
                    scroll
                });
            }
        });
    } else {
        res.status(403).json({ error: "Insufficient Priviledges" });
    }
});
app.post("/brothers/addOfficer", function (req, res) {
    let { current, title } = req.body;
    if (reqToRole(req) === ROLES.HISTOR) {
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
        res.status(403).json({ error: "Insufficient Priviledges" });
    }
});
module.exports.handler = serverless(app);
