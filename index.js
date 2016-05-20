var mongo = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var randexp = require('randexp');
var regex = /[\d\w]{8}/;
var url = require('url');

function shortCode(r){
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
