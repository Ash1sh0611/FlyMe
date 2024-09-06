const details = document.querySelector("#onload")
const loading = document.querySelector("#loading")
const filterForm = document.querySelector("#filter-form")
const subContainer = document.querySelector("#sub-container")
const zeroCount = document.querySelector(".zero-count")
const headerFrom = document.querySelector("#header-from")
const headerTo = document.querySelector("#header-to")
const headerDate = document.querySelector("#header-date")
const headerClass = document.querySelector("#header-class")

let flightsVar = {}

zeroCount.style.display = "none"
subContainer.style.display = "none"

window.addEventListener("load", () => {
    const xhr = new XMLHttpRequest()
    
    const location = window.location.href
    xhr.open("POST", location)
    xhr.setRequestHeader("Content-Type", "application/json")
    xhr.onload = () => {
        if(xhr.status === 200) {
            flightsVar = JSON.parse(xhr.response)
            loading.style.display = "none"
            subContainer.style.display = "block"

            document.querySelector("#max_price").value = flightsVar.price[0].max_price

            const params = new Proxy(new URLSearchParams(window.location.search), {
                get: (searchParams, prop) => searchParams.get(prop),
              });

            headerFrom.innerHTML = params.from.toUpperCase()
            headerTo.innerHTML = params.to.toUpperCase()
            headerDate.innerHTML = params.dep
            headerClass.innerHTML = params.class

            flightsDisplay(flightsVar)
            eventHandler(flightsVar)
        } else console.error("Error on loading")
    }

    const data = {
        string: "api call"
    }

    xhr.send(JSON.stringify(data))
    console.log("API request has been made...")
})

let flightsDisplay = (flights) => {
    for(let i=0; i<flights.meta.count; i++) {

        const flight = flights.data[i]

        let detailObj = {}
        let segmentsLength = flight.itineraries[0].segments.length

        detailObj.id = parseInt(flight.id)

        detailObj.name = airlineName(flights, i, flight)
        
        detailObj.date = {}
        detailObj.time = {}

        detailObj.time.departure = flight.itineraries[0].segments[0].departure.at.substr(11)
        detailObj.date.departure = flight.itineraries[0].segments[0].departure.at.substr(0, 10)

        detailObj.time.arrival = flight.itineraries[0].segments[segmentsLength - 1].arrival.at.substr(11)
        detailObj.date.arrival = flight.itineraries[0].segments[segmentsLength - 1].arrival.at.substr(0, 10)

        detailObj.duration = flight.itineraries[0].duration.substr(1).replace("T", "").replace("D", "d ").replace("H", "h ").replace("M", "m ").replace("S", "s ").trim()

        detailObj.price = flight.price.total

        details.innerHTML += 
            `<div id="${detailObj.id}" class="plane row my-2 border-top border-bottom" data-bs-toggle="modal" data-bs-target="#modal">
                <div id="${detailObj.id}" class="name col">${detailObj.name}</div>
                <div id="${detailObj.id}" class="departure col">
                    <div id="${detailObj.id}" class="time row">${detailObj.time.departure}</div>
                    <div id="${detailObj.id}" class="date row">${detailObj.date.departure}</div>
                </div>
                <div id="${detailObj.id}" class="arrival col">
                    <div id="${detailObj.id}" class="time row">${detailObj.time.arrival}</div>
                    <div id="${detailObj.id}" class="date row">${detailObj.date.arrival}</div>
                </div>
                <div id="${detailObj.id}" class="duration col">${detailObj.duration}</div>
                <div id="${detailObj.id}" class="price col">₹${detailObj.price}</div>
            </div>`
        
    }
}

let airlineName = (list, index, flight) => {
    const names = []
    console.log(flight)
    for(let i=0; i<flight.validatingAirlineCodes.length; i++) {
        for(key in list.dictionaries.carriers) {
            if(key === flight.validatingAirlineCodes[i]) {
                names.push(list.dictionaries.carriers[key])
                break
            } else if (key === Object.keys(list.dictionaries.carriers)[Object.keys(list.dictionaries.carriers).length - 1]) {
                names.push(flight.validatingAirlineCodes[i])
            }
        }
    }
    return names.join(" & ")
}

let eventHandler = (list) => {
    let planes = document.querySelectorAll(".plane")

    for(let i=0; i<planes.length; i++) {
        planes[i].addEventListener("click", (e) => {
            // console.log(e.target.id)
            let id = parseInt(e.target.id)
            let flight = list.data[id - 1]
            let modalBody = document.querySelector(".modal-body")

            console.log(id)

            const params = new Proxy(new URLSearchParams(window.location.search), {
                get: (searchParams, prop) => searchParams.get(prop),
              });

            let modalObj = {}

            modalObj.from = params.from
            modalObj.to = params.to
            // modalObj.stopCount = 0
            modalObj.duration = flight.itineraries[0].duration.substr(1).replace("T", "").replace("D", "d ").replace("H", "h ").replace("M", "m ").replace("S", "s ").trim()
            modalObj.class = flight.travelerPricings[0].fareDetailsBySegment[0].cabin
            
            modalBody.innerHTML = 
            `<div class="container">
                <span class="fs-3 text-uppercase">${modalObj.from}</span><span class="fs-3 text-uppercase"><b>-></b></span><span class="fs-3">${modalObj.to}</span><br><span class="fs-3">${modalObj.duration}</span><pre class="d-inline">   </pre><span class="class fs-3">${modalObj.class}</span>
                <pre>  </pre>
            </div>`
            for(let i=0; i<flight.itineraries[0].segments.length; i++) {
                const obj = flight.itineraries[0].segments[i]
                modalBody.innerHTML += 
                `<div class="row">
                    <div class="col-sm-5">
                        <div class="row fs-5">${obj.departure.iataCode}</div>
                        <div class="row fs-5">${obj.departure.at}</div>
                        <div class="row fs-5">Terminal: ${obj.departure.terminal || "-"}</div>
                    </div>
                    <div class="col-sm-2"><b>${obj.duration.substr(1).replace("T", "").replace("D", "d ").replace("H", "h ").replace("M", "m ").replace("S", "s ").trim()}</b></div>
                    <div class="col-sm-5">
                        <div class="row fs-5">${obj.arrival.iataCode}</div>
                        <div class="row fs-5">${obj.arrival.at}</div>
                        <div class="row fs-5">Terminal: ${obj.arrival.terminal || "-"}</div>
                    </div>
                </div>`
            }
        })
    }
}

let formChange = () => {
    let formData = new FormData(filterForm)
    let postData = {}

    postData.string = "filter"
    postData.stops = formData.getAll("stops")
    
    for(let i=0; i<postData.stops.length; i++) {
        if(postData.stops[i] == "non_stope") {
            postData.stops[i] = 0
        } else if(postData.stops[i] == "1_stop") {
            postData.stops[i] = 1
        } else {
            postData.stops[i] = 2
        }
    }

    console.log(postData)

    postData.min_price = formData.get("min_price")
    postData.max_price = formData.get("max_price")

    const location = window.location.href

    let xhr = new XMLHttpRequest()
    xhr.open("POST", location)
    xhr.setRequestHeader("Content-Type", "application/json")

    xhr.onload = () => {
        if(xhr.status == 200) {
            let flightIdArr = JSON.parse(xhr.response)
            let planes = document.querySelectorAll(".plane")

            console.log(flightIdArr)
            
            if(flightIdArr.length == 0) {
                zeroCount.style.display = "flex"
                console.log("ZERO")
            }
            
            planes.forEach((e) => {
                e.style.display = "none"
            })
    
            for(let i=0; i<flightIdArr.length; i++) {
                planes[flightIdArr[i].flight_id - 1].style.display = "flex"
            }
            
        }
    }

    xhr.send(JSON.stringify(postData))
}