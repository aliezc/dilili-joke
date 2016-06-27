'use strict';

var pengfu = require('pengfu-gather');
var budejie = require('budejie-gather');
var lengxiaohua = require('lengxiaohua-gather');
var mongo = require('mongodb');
var crypto = require('crypto');
var assert = require('assert');
var redis = require('redis');

var save_data = function(collection, data, cb){
	collection.find({md5: data.md5}).count(function(err, cnt){
		assert(err == null);
		
		var result = {
			insert: 0,
			fail: 0,
			exists: 0
		};
		
		if(cnt == 0){
			collection.insertOne(data, function(err, res){
				if(err) result.fail++;
				
				result.insert = res.insertedCount || 0;
				if(typeof cb == 'function') cb.call(null, result);
			});
		}else{
			result.exists++;
			if(typeof cb == 'function') cb.call(null, result);
		}
	});
}

var update_database_count = function(){
	var rc = redis.createClient();
	rc.on('error', function(err){
		console.log('Redis error: ' + err);
	});
	rc.auth('dilili', function(){
		mongo.MongoClient.connect('mongodb://127.0.0.1:27017/dilili', function(err, db){
			assert(err == null);
			
			db.collection('joke').find({}).count(function(err, cnt){
				assert(err == null);
				
				rc.set('joke_count', cnt.toString());
				console.log('更新笑话数量：' + cnt);
				db.close();
			});
		});
	});
}

var save_to_database = function(refer, arr, cb){
	mongo.MongoClient.connect('mongodb://127.0.0.1:27017/dilili', function(err, db){
		assert.equal(null, err);
		
		var joke = db.collection('joke');
		
		// 已存在数量
		var exists_count = 0;
		
		// 新增数量
		var insert_count = 0;
		
		// 插入失败数量
		var fail_count = 0;
		
		for(var i = 0; i < arr.length; i++){
			// 计算数据的散列值
			var md5 = require('crypto').createHash('md5').update(arr[i]).digest('hex');
			
			var content = arr[i];
			
			var data = {
				content: content,
				md5: md5,
				time: Date.now(),
				refer: refer
			};
			
			save_data(joke, data, function(res){
				exists_count += res.exists;
				insert_count += res.insert;
				fail_count += res.fail;
				
				if(exists_count + insert_count + fail_count == arr.length){
					db.close();
					console.log(new Date().toString() + ': ' + '已处理' + refer + '数据' + (exists_count + insert_count + fail_count) + '条，新增' + insert_count + '条，已存在' + exists_count + '条，插入失败' + fail_count + '条');
					if('function' == typeof cb) cb.call(null);
				}
			});
		}
	});
}

var gather = function(page){
	// 获取捧腹网
	pengfu(1, 10, function(arr){
		save_to_database('pengfu', arr, update_database_count);
	});
	
	// 获取百思不得姐
	budejie(1, 10, function(arr){
		save_to_database('budejie', arr, update_database_count);
	});
	
	// 获取冷笑话
	lengxiaohua(1, 10, function(arr){
		save_to_database('lengxiaohua', arr, update_database_count);
	});
}

module.exports = gather;

