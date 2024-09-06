const form = document.querySelector("#form")
const submitBtn = document.querySelector("#submit")

form.addEventListener("submit", (e) => {
    e.preventDefault()

    let formData = new FormData(form)
    let query = `type=${formData.get("journey_type")}&from=${formData.get("from")}&to=${formData.get("to")}&dep=${formData.get("dep")}&return=${formData.get("return")}&adult=${formData.get("adult")}&child=${formData.get("child")}&infant=${formData.get("infant")}&class=${formData.get("class")}`
    console.log(window.location.origin + `/flight-details?${query}`)
    window.location.href = window.location.origin + `/flight-details?${query}`
})