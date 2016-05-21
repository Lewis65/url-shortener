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
    res.render('index', {output: "Please enter a URL"});
    res.end();
});

app.use(bodyParser.urlencoded({extended: true}));

function validUrl(urlPassed, req, res){
    var urlEntered = urlPassed;
    var shortCode;
    //check if there is a shortcode for this url already
    mongo.connect(mongoURI, function(err, db){
        if (err) throw err;
        db.collection('urls').find({
            "url": urlEntered
        }).toArray(function(err, results){
            if(results.length === 0){
                newCodePair(urlEntered);
            } else {
                shortCode = results[0].code;
                checkPair(shortCode);
            }
        });
    })
    //if not, create one
    function newCodePair(url){
        var tempCode = newShortCode(regex);
        var codeFound;
        mongo.connect(mongoURI, function(err, db){
            if (err) throw err;
            //look for the proposed code in the db
            codeFound = db.collection('urls').find({
                "code": tempCode
            }).toArray(function(err, results){
                if(results.length > 0){
                    //if code is in use in db, generate a new one with recursion
                    newCodePair(url);
                } else {
                    shortCode = tempCode;
                    mongo.connect(mongoURI, function(err, db){
                        db.collection('urls').insert({
                            "url": urlEntered,
                            "code": shortCode
                        });
                        pairCreated();
                    });
                }
            });
        });
    }
    function checkPair(currentCode){
        res.render("index", {output:
            urlEntered + " already has the shortened URL <a href='" + getShort(currentCode) + "'>" + getShort(currentCode) + "</a>"
        })
        res.end();
    }
    function pairCreated(){
        res.render("index", {
            output: "Success! URL " + urlEntered + " is now reachable via " +
            "<a href='" + getShort(shortCode) + "'>" + getShort(shortCode) + "</a>"
            }
        );
        res.end();
    }
    function getShort(codePassed){
        return req.protocol + "://" + req.get("host") + "/" + codePassed;
    }
}

//index form POST
app.post('/', function(req, res){
    //set url entered to the value of the text field
    var urlbox = req.body.urlbox;
    var shortCode, thisEntry;
    //if it is a valid url, check for an existing short code
    if(isUrl(urlbox)){
        validUrl(urlbox, req, res);
    } else {
        if(isUrl("http://" + urlbox)){
            validUrl("http://" + urlbox, req, res);
        } else {
            //not a valid url
            res.render("index", {output: "Invalid url."});
            res.end();
        }
    }
})

//when you get a short code
app.get('/:query', function(req, res){
    var codeQuery = req.params.query;
    mongo.connect(mongoURI, function(err, db){
        if(err) throw err;
        //find the code in collection
        var findMatch = db.collection('urls').find({
            "code": codeQuery
        }).toArray(function(err, results){
            //redirect to matching url
            if(results.length > 0){
                res.redirect(results[0].url)
            } else {
                res.render('index', {output: "Error: Shortcode not found"})
                res.end();
            }
        });
    });
});

app.listen(process.env.PORT || 8080);
