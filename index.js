//process.env.MONGO_URI not working? not sure why
var mongo = require('mongodb').MongoClient,
    mongoURI = "mongodb://user:password@ds025232.mlab.com:25232/url-shortener";
var express = require('express'),
    app = express();
var url = require('url');
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
    res.render('index', {output: "Please enter a full URL (including 'http://')"});
    res.end();
});

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
        mongo.connect(mongoURI, function(err, db){
            //DEBUG
            console.log("Connected to MongoDB at line 77")
            if (err) throw err;
            db.collection('urls').find({
                "url": urlEntered
            }).toArray(function(err, results){
                thisEntry = results;
                //DEBUG
                console.log("Returned document(s):");
                console.log(thisEntry);
                if(thisEntry.length === 0){
                    newCodePair(urlEntered);
                } else {
                    shortCode = thisEntry[0].code;
                    checkPair(shortCode);
                }
            });
        })
        //if not, create one
        function newCodePair(url){
            //DEBUG
            console.log("called newCodePair(" + url + ")")
            var tempCode = newShortCode(regex);
            var codeFound;
            mongo.connect(mongoURI, function(err, db){
                //DEBUG
                console.log("Connected to MongoDB at line 80");
                if (err) throw err;
                //look for the proposed code in the db
                codeFound = db.collection('urls').find({
                    "code": tempCode
                }).toArray(function(err, results){
                    if(results.length > 0){
                        //if code is in use in db, generate a new one with recursion
                        //(bad idea with async callbacks, no?)
                        //DEBUG
                        console.log(tempCode + " is in use. Trying again...")
                        newCodePair(url);
                    } else {
                        //DEBUG
                        console.log(tempCode + " not found in use in db")
                        mongo.connect(mongoURI, function(err, db){
                            shortCode = tempCode;
                            db.collection('urls').insert({
                                "url": urlEntered,
                                "code": shortCode
                            });
                            pairCreated();
                        })
                    }
                });
            })
        }
        function checkPair(currentCode){
            //DEBUG
            console.log("Called checkPair() with the shortCode " + currentCode);
            //DEBUG
            console.log("Found pair for url " + urlEntered + " - " + currentCode);
            res.render("index", {output:
                "Success! " + urlEntered + " already has the shortened URL <a href='" + getShort(currentCode) + "'>" + getShort(currentCode) + "</a>"
            })
            res.end();
        }
        function pairCreated(){
            //DEBUG
            console.log("Inserted document: url: " + urlEntered + "code: " + shortCode);
            res.render("index", {
                output: "Success! URL " + urlEntered + " is now reachable via " +
                "<a href='#'>" + getShort(shortCode) + "</a>"
                }
            );
            res.end();
        }
        function getShort(codePassed){
            return req.protocol + "://" + req.get("host") + "/" + codePassed;
        }
    } else {
        //not a valid url
        res.render('index', {output: "Invalid url."});
        res.end();
    }
})

//when you get a short code
app.get('/:query', function(req, res){
    var codeQuery = req.params.query;
    console.log("codeQuery = " + codeQuery);
    mongo.connect(mongoURI, function(err, db){
        if(err) throw err;
        //find the code in collection
        var findMatch = db.collection('urls').find({
            "code": codeQuery
        }).toArray(function(err, results){
            //redirect to matching url
            console.log(results);
            if(results.length > 0){
                console.log("Redirecting")
                res.redirect(results[0].url)
            } else {
                console.log("No results for " + codeQuery);
                res.render('index', {output: "Error: Shortcode not found"})
                res.end();
            }
        });
    });
});

app.listen(process.env.PORT || 8080);
