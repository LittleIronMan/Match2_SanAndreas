import express, {Request, Response, NextFunction, RequestHandler} from "express";
//import cors from "cors";
//import fs from "fs";
import path from "path";
//import bodyParser from "body-parser";

const app = express();

//app.use(bodyParser.text());
app.use("/static", express.static(path.join(__dirname, 'static')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log("Express server listening on port " + port + ".");
});