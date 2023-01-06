const express = require('express')
const Validator = require('jsonschema').Validator
const v = new Validator()
const app = express()
const port = 6000

var signInRequest = {
	"id": "/SignInRequest",
	"type": "object",
	"properties": {
		"UserId": { "type": "ulong" },
		"Version": { "type": "string" },
		"Hash": { "type": "uint" }
	}
}

var signInResponse = {
	
}

v.addSchema()

app.get('/signin', (req, res) => {
	console.log(v.validate(req, signInRequest))
	res.send("Success.")
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})