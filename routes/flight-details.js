const express = require("express")
const router = express.Router()

const cookieParser = require("cookie-parser")
router.use(cookieParser())

const {createConnection} = require("mysql")
const con = createConnection({
    host: "localhost",
    user: "root",
    password: "56789012"
})

var Amadeus = require('amadeus');
const { promiseImpl } = require("ejs");
const { response } = require("express")

var amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

const errorCodes = {
    477: "Invalid Fomat",
    572: "Invalid Option",
    2781: "Invalid Length",
    4926: "Invalid Data Recieved",
    32171: "Mandatory Data Missing"
}

let placeObj = {from: {}, to: {}}
let cookieId

router.use("/flight-details", (req, res, next) => {
  /*functions to convert CITY NAME into IATA CODE 
  so that flight-offer-search API can work properly*/
  /*...All this middleware does is, to take FROM and TO City names/IATA code/Airport name and get its IATA code either from already stored Database or from the API. It first reaches for database if desired city's IATA code isnt available it fetches the same from the API and updates database thus its available in the database for further use...*/ 

  if(!req.cookies.userId) {
    return res.redirect("/")
  }
  else {
    cookieId = req.cookies.userId
  }

  if(req.method === "POST") {
    
    if(req.body.string === "api call") {

      //To delete previously queried database
      con.query(`delete from flyme.one_way where user_id = "${req.cookies.userId}"`, (err, response) => {
        if(err) {
          console.log("error - deleting entries from the Data base failed when RELOADED")
          console.error(err)
        }
      })

      let isCityExistFrom = true
      let isCityExistTo = true
    
      let fromPromise = () => {
        return amadeus.referenceData.locations.get({
          keyword : req.query.from,
          subType : "AIRPORT"
        })
      } 
      let toPromise = () => {
        return amadeus.referenceData.locations.get({
          keyword : req.query.to,
          subType : "AIRPORT"
        })
      } 
    
      const fromCitySearch = () => {
        return new Promise((resolve, reject)=>{
            con.query(`select * from flyme.city where city_name = "${req.query.from}";`,  (error, results) => {
                if(error) {
                  return reject(error)
                }
                return resolve(results)
            })
        })
      }
      const fromFinalPromise = fromCitySearch().then((resolve, reject) => {
        if(Object.keys(resolve).length == 0) {
          isCityExistFrom = false
          return fromPromise()
        }
        else {
          let placeTempObj = {}
          placeTempObj.data = []
          placeTempObj.data[0] = {iataCode: resolve[0].iataCode}
          return placeTempObj
        }
      })
    
      const toCitySearch = () => {
        return new Promise((resolve, reject)=>{
            con.query(`select * from flyme.city where city_name = "${req.query.to}";`,  (error, results) => {
                if(error) {
                  return reject(error)
                }
                return resolve(results)
            })
        })
      }
      const toFinalPromise = toCitySearch().then((resolve, reject) => {
        if(Object.keys(resolve).length === 0) {
          isCityExistTo = false
          return toPromise()
        }
        else {
          let placeTempObj = {}
          placeTempObj.data = []
          placeTempObj.data[0] = {iataCode: resolve[0].iataCode}
          return placeTempObj
        }
      })
        
      Promise.all([fromFinalPromise, toFinalPromise]).then((values) => {
        for(let i=0; i<values.length; i++) {
          console.log(values[i].data[0])
        }
        placeObj.from = values[0].data[0]
        placeObj.to = values[1].data[0]
        if(!isCityExistFrom) {
          isCityExistFrom = true
          console.log(values[0].data[0])
          con.query(`insert into flyme.city(city_name, iataCode) values ("${values[0].data[0].address.cityName}", "${values[0].data[0].iataCode}");`, (err, res) => {
            if(err) console.error(err)
            else console.log(`${values[0].data[0].address.cityName} : ${values[0].data[0].iataCode} entered into database`)
          })
        }
        if(!isCityExistTo) {
          isCityExistTo = true
          con.query(`insert into flyme.city(city_name, iataCode) values ("${values[1].data[0].address.cityName}", "${values[1].data[0].iataCode}");`, (err, res) => {
            if(err) console.error(err)
            else console.log(`${values[1].data[0].address.cityName} : ${values[1].data[0].iataCode} entered into database`)
          })
        }
        next()
      }).catch(err => {
        console.error(err)
      })
    } else {
      next()
    } 
  } else next()
})

router.route("/flight-details").get((req, res) => {
  console.log(req.query)
  res.render("flight-details")
}).post((req, res) => {
  /*Function to get ALL FLIGHT Details matching the user's input criteria*/
  /*...This function calls for API everytime user clicks SEARCH FLIGHT...*/

  if(req.body.string === "api call") {
    let flightObj = {}
    const search = req.query
    let flightsSearch = amadeus.shopping.flightOffersSearch.get({
      originLocationCode: placeObj.from.iataCode,
      destinationLocationCode: placeObj.to.iataCode,
      departureDate: search.dep,
      adults: search.adult,
      children: search.child,
      infants: search.infant,
      travelClass: search.class,
      currencyCode: "INR"
    }).then((response) => {
      flightObj = response.result
      return databasePush(response)
    }).then(response => {
      console.log("DATABASE QUERIED SUCCESSFULLY!!!")
      return new Promise((result, reject) => {
        con.query(`select MAX(total_cost) as max_price from flyme.one_way where user_id="${req.cookies.userId}"`, (error, rsp) => {
          if(error) {
            return reject(error)  
          }
          else 
            return result(rsp)
        })
      })
    }).then((response) => {
      flightObj.price = response
      res.send(flightObj)
    }).catch(err => {
      console.error(err)
    })
  
    let databasePush = (response) => {
      return new Promise((resolve, reject) => {
        let query = `insert into flyme.one_way(flight_id, airline_code, dep_date, arrival_date, duration, total_cost, user_id, airline_name, noStops, entry_time) values`
        
        const data = response.result
        
        for(let i=0; i<data.meta.count; i++)
        {
          let stopObj = stopFinder(data.data[i].itineraries[0].segments)
          
          let flightDuration = (duration) => {
            duration = duration.substr(1)
            duration = duration.replace("T", "").replace("D", " Days ").replace("H", " Hours ").replace("M", " Mins ").replace("S", " Secs").trim()
            return duration
          }
          
          let airlineCode = data.data[i].itineraries[0].segments[0].carrierCode
          let airlineName = data.dictionaries.carriers[airlineCode]
          
  
          query += `(${data.data[i].id}, "${airlineCode}", "${dateTime(stopObj.depDateTime)}", "${dateTime(stopObj.arrivalDateTime)}", "${flightDuration(data.data[i].itineraries[0].duration)}", ${data.data[i].price.total}, "${cookieId}", "${airlineName}", ${stopObj.numStops}, now())`
  
          if(i != data.meta.count - 1) {
            query += ","
          }
          else 
            query += ";"
        }
  
        con.query(query, (err, res) => {
          if(err)
            return reject(err)
          else
            return resolve(res)
        })
      })
    }
  }
  else if(req.body.string === "filter") {
    //To run FILTER requests
    let query = `select flight_id from flyme.one_way where `
    let reqBody = req.body
    
    if(reqBody.stops.length > 1) 
      query += ` ( `

    for(let i=0; i<reqBody.stops.length; i++) {
      if(i>0) {
        query += ` or `
      }
      if(reqBody.stops[i] === 2) {
        query += ` noStops > 1 `
      } else {
        query += ` noStops = ${reqBody.stops[i]} `
      }
      if(i>0 && i==reqBody.stops.length - 1) {
        query += ` ) `
      }
    }

    if(query != "select flight_id from flyme.one_way where ") {
      query += ` and `
    }

    query += ` (total_cost >= ${reqBody.min_price} and total_cost <= ${reqBody.max_price}) and user_id = "${req.cookies.userId}";`

    console.log(query)

    let filterFunc = new Promise((response, reject) => {
      con.query(query, (error, result) => {
        if(error)
          reject(error)
        else
          response(result)
      })
    })

    filterFunc.then(response => {
      console.log("Filter checked perfectly!!!")
      res.send(response)
    }).catch(err => console.error(err))
  }
})

function dateTime(now) {
  let date=now.substr(0, 10)
  let time = now.substr(11, 8)
  return (date + " " + time)
}

function stopFinder(stopArr) {
  function indexFinder(string, iataCode) {
    for(let i=0; i<stopArr.length; i++) {
      if(string === "departure") {
        if(stopArr[i].departure.iataCode == iataCode)
          return i
      }
      else if(string === "arrival") {
        if(stopArr[i].arrival.iataCode == iataCode)
          return i
      }
    }
  }

  let dep = indexFinder("departure", placeObj.from.iataCode)
  let arr = indexFinder("arrival", placeObj.to.iataCode)
  let count = 0

  for(let i=dep; i<=arr; i++) {
    count += stopArr[i].numberOfStops
  }

  return {
    depDateTime: stopArr[0].departure.at,
    arrivalDateTime: stopArr[stopArr.length - 1].arrival.at,
    numStops: count
  }
}

module.exports = router