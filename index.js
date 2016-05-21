//process.env.MONGO_URI not working? not sure why
var mongo = require('mongodb').MongoClient,
    mongoURI = "mongodb://user:password@ds025232.mlab.com:25232/url-shortener";
var express = require('express'),
    app = express();
//Stupid favicon
var favicon = require('serve-favicon');
//Form validation and posting and such
var isUrl = require('is-url');
var bodyParser = require('body-parser');
var $ = require('jquery')(require('jsdom').jsdom().defaultView);
//For generating shortcodes
var randexp = require('randexp'),
    regex = /[\d\w]{8}/;
function newShortCode(r){
    return new randexp(r).gen();
}

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static(__dirname + '/public'));

//index GET
app.get('/', function(req, res){
    //DEBUG
    console.log("Received GET for index =================================");
    res.render('index', {output: ""});
    res.end();
});

//send a POST from submit button
/*
$(function(){
    $("#btnSubmit").on("click", function(event){
        event.preventDefault;
        //DEBUG
        console.log("Attempting POST for " + $("#urlbox").val());
        $.ajax({
            type: "POST",
            data: $("#urlbox").val(),
            url: "/",
            dataType: "json",
        }).done(function(response){
            //DEBUG
            console.log("POST was successful");
            console.log(response);
            if(response.message === ""){
                app.render("index", {
                    output: response.code
                });
            } else {
                app.render("index", {
                    output: "Error with POST response: " + response.message
                });
            }
        });
    });
});
*/

app.use(bodyParser.urlencoded({extended: true}));

//index form POST
app.post('/', function(req, res){
    //DEBUG
    console.log("POST was routed to '/'");
    console.log(req.body);
    //set url entered to the value of the text field
    var urlEntered = req.body.urlbox;
    //DEBUG
    console.log("Url entered was " + urlEntered);
    var shortCode, thisEntry;
    //if it is a valid url, check for an existing short code
    if(isUrl(urlEntered)){
        //check if there is a shortcode for this url already
        //not scalable? 1 in 61^8 chance of duplicate seems fine
        mongo.connect(mongoURI, function(err, db){
            //DEBUG
            console.log("Connected to MongoDB at line 77")
            if (err) throw err;
            thisEntry = db.collection('urls').find({
                "url": urlEntered
            });
            shortCode = thisEntry.code;
        })
        //if not, create one
        function newCodePair(url){
            //DEBUG
            console.log("called newCodePair(" + url + ")")
            var tempCode = newShortCode(regex);
            var codeFound = false;
            mongo.connect(mongoURI, function(err, db){
                //DEBUG
                console.log("Connected to MongoDB at line 92");
                if (err) throw err;
                //look for the proposed code in the db
                codeFound = db.collection('urls').find({
                    "code": tempCode
                }).size;
                if(codeFound){
                    //if code is in use in db, generate a new one with recursion
                    //(bad idea with async callbacks, no?)
                    //DEBUG
                    console.log(tempCode + " is in use. Trying again...")
                    newCodePair(url);
                } else {
                    //DEBUG
                    console.log(codeFound + "not found in ")
                    //if not in use, return the unused code
                    return tempCode;
                }
            })
        }
        if(!shortCode){
            //DEBUG
            console.log("Found no shortcode assigned to url " + urlEntered);
            //if shortCode isn't assigned yet, generate a new one
            shortCode = newCodePair(urlEntered);
        } else {
            mongo.connect(mongoURI, function(err, db){
                //DEBUG
                console.log("Connected to MongoDB at line 117");
                if (err) throw err;
                db.collection('urls').insert({
                    url: +urlEntered,
                    code: +shortCode
                })
            })
        }
    } else {
        res.render('index', {output: "Invalid url."})
    }
    res.end();
})

//when you get a short code
app.get('/:query', function(req, res){
    var codeQuery = req.params.query;
    mongo.connect(mongoURI, function(err, db){
        if(err) throw err;
        //find the code in collection
        var urlFound = db.collection('urls').find({
            code: +codeQuery
        })
        //redirect to matching url
        if(urlFound){
            res.redirect(urlFound.url)
        } else {
            res.render('index', {output: "Code not found."})
        }
        res.end();
    })
})

app.listen(process.env.PORT || 8080);
