const express = require("express")
const app = express()

const uuid = require("uuid")

// const fetch = require("node-fetch-npm")

const cookieParser = require("cookie-parser")
app.use(cookieParser())

const bodyParser = require("body-parser")
app.use(bodyParser.urlencoded({extended: false}))
app.use(express.json())

const {createConnection} = require("mysql")
const con = createConnection({
    host: "localhost",
    user: "root",
    password: "56789012"
})

con.connect((err) => {
    if (err) throw err;
    console.log("Connected!");
});

const dotenv = require("dotenv")
dotenv.config()

app.set("view engine", "ejs")
app.use(express.static(__dirname + "/public"))

let user_id

app.use("/", (req, res, next) => {
    if(req.method === "GET" && req.url === "/") {
        cookieSet(req, res)
        con.query(`delete from flyme.one_way where user_id = "${user_id}"`, (err, res) => {
            if(err) throw err
            else console.log(`Deleted all the records of ${user_id} from database...`)
        })
    }
    next()
})

app.route("/").get((req, res) => {
    res.render("index")
})

const flightDetailRouter = require("./routes/flight-details")
app.use("/", flightDetailRouter)

const port = process.env.PORT

app.listen(port, console.log(`Hosted on PORT ${port}...`))

function cookieSet(req, res) {
    let today = new Date()
    let tom = new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000))
    let tomMilli = tom.getTime()

    if(!req.cookies.userId) {
        let cookieId = uuid.v4()
        res.cookie("userId", cookieId, {expire: tomMilli})
        user_id = cookieId
        console.log(`cookie set: ${cookieId}`)
    }
    else {
        user_id = req.cookies.userId
        console.log(`User logged in with id: ${user_id}`)
    }
}

// con.query(`select * from flyme.city where city_name = "DELHI"`).then(res=>{console.log(res)}).catch(err=>{console.error(err)})

// con.connect((err) => {
//         if (err) throw err;
//         console.log("Connected!");
//         sql = `SELECT * FROconstM flyme.city WHERE iataCode = 'abc'`
//         const prom = con.query(sql)
//         prom.then(res=>console.log(res))
//         con.end(); //close the connection after getting the result
// })

setInterval(() => {
    con.query(`delete from flyme.one_way where (timestampdiff(hour, entry_time, now()) > 24)`, (err, res) => {
        if(err) throw err
    })
}, (0.5*60*60*1000))