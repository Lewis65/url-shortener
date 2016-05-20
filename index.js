var mongo = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var randexp = require('randexp');
var regex = /[\d\w]{8}/;
var url = require('url');
var bodyParser = require('body-parser');
var $ = require('jquery')(require('jsdom').jsdom().defaultView);

function newShortCode(r){
    return new randexp(r).gen();
}

app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static(__dirname + '/public'));

//index
app.get('/', function(req, res){
    res.render('index', {output: ""});
    res.end();
});

//index form handler
app.post('/', function(req, res){
    //set url entered to the value of the text field
    var urlEntered = $("#urlbox").cont();
    //if it is a valid url, check for an existing short code
    if(url.isValid(urlEntered)){
        //check if there is a shortcode for this url already
        //not scalable? 1 in 61^8 chance of duplicate seems fine
        var shortCode;
        mongo.connect(process.env.MONGOLAB_URI, function(err, db){
            if (err) throw err;
            shortCode = db.collection('urls').find({
                url: +urlEntered
            })
        })
        //if not, create one
        function newCodePair(url){
            var tempCode = newShortCode(regex);
            var codeFound = false;
            mongo.connect(process.env.MONGOLAB_URI, function(err, db){
                if (err) throw err;
                //look for the proposed code in the db
                codeFound = db.collection('urls').find({
                    code: +tempCode
                })
                if(codeFound){
                    //if code is in use, generate a new one with recursion
                    //(bad idea with async callbacks, no?)
                    newCodePair(url);
                } else {
                    //if not in use, return the unused code
                    return tempCode;
                }
            })
        }
        if(!shortCode){
            //if shortCode isn't assigned yet, generate a new one
            shortCode = newCodePair(urlEntered);
        } else {
            mongo.connect(process.env.MONGOLAB_URI, function(err, db){
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
    mongo.connect(process.env.MONGOLAB_URI, function(err, db){
        if(err) throw err;
        var collection = db.collection('urls');
        var code = req.params.query;
        //find the code in collection
        //redirect to matching url
    })
})

app.listen(process.env.PORT || 8080);
