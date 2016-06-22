'use strict';

var aliez = require('aliez');
var http = require('http');
var mongo = require('mongodb');
var assert = require('assert');
var redis = require('redis');
var cp = require('child_process');
var gather = require('./lib/joke-gather.js');

var mongourl = 'mongodb://127.0.0.1:27017/dilili';

gather();

setInterval(gather, 1000 * 60 * 60 * 6);

var app = aliez(function(req, res){
	
	// 静态文件
	req.match(/^\/css\/(.*)/, function(req, res){
		res.dir('./css');
	});
	req.match(/^\/image\/(.*)/, function(req, res){
		res.dir('./image');
	});
	
	// 首页
	req.match('/', function(req, res){
		mongo.MongoClient.connect(mongourl, function(err, db){
			assert(err == null);
			
			var joke = db.collection('joke');
			var page = req.query ? (req.query.p || 1) : 1;
			joke.find({}).skip((page - 1) * 20).limit(20).sort({"time": -1}).toArray(function(err, arr){
				assert(err == null);
				
				var str = '';
				for(var i = 0; i < arr.length; i++){
					str += '<div>' + arr[i].content + '</div>';
				}
				
				if(str == ''){
					str = '<div style="text-align:center">没有啦 ╮（╯＿╰）╭</div>';
				}
				
				var rc = redis.createClient();
				rc.on('error', function(err){
					console.log('Redis error: ' + err);
				});
				rc.auth('dilili', function(){
					rc.get('joke_count', function(err, tmp){
						// 获取笑话总数
						var count = +tmp.toString();
						
						var prev = page == 1 ? '' : '<a href="?p=' + (page - 1) + '" class="prev">上一页</a>';
						var next = page == Math.ceil(count / 20) ? '' : '<a href="?p=' + (+page + 1) + '" class="next">下一页</a>';
						
						res.render('./html/index.htm', {
							title: '滴哩哩笑话',
							list: str,
							prev: prev,
							next: next
						});
					});
				});
			});
		});
	});
	
	req.match('/about', function(req, res){
		res.render('./html/about.htm', {title: '滴哩哩笑话'});
	});
	
	// 404
	req.default(function(req, res){
		res.send(new Buffer(''));
	});
});

app.use(require('aliez-match'));
app.use(require('aliez-mime'));
app.use(require('aliez-response'));
app.use(require('aliez-static'));
app.use(require('aliez-render'));
app.use(require('aliez-query'));

// cp.fork('./lib/joke-gather.js');

http.createServer(app).listen(2378);
