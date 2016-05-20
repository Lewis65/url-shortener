var mongo = require('mongodb').MongoClient;
var express = require('express');
var app = express();
var favicon = require('serve-favicon');
var randexp = require('randexp');
var regex = /[\d\w]{8}/;
var url = require('url');
var bodyParser = require('body-parser');
var $ = require('jquery')(require('jsdom').jsdom().defaultView);

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

//index form handler
app.use(bodyParser.urlencoded({extended: true}));
app.post('/', function(req, res){
    var urlEntered = req.query.name;
    console.log(req.query);
    res.render('index', {output: urlEntered});
    res.end();
})
$("#form").submit(function(page){
    page.preventDefault();
    $.post(
        $("#form").attr("action"),
        $("#form").serialize(),
        function(data){
            //this doesn't work. fuck.
        },
        "json"
    );
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
