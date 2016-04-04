var request = require('request');
var parser = require('node-tims-custom-soql-parser'),
	restify = require('restify'),
	_ = require('underscore'),
	anyDB = require('any-db-postgres'),
	processWhere = require('./lib/where'),
	processSelect = require('./lib/select');
require('dotenv').load({silent: true});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 5000,
	server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1', 
	tables = {},
	server = restify.createServer();
server.use(restify.queryParser());

server.get('/:user/:table', function(req, res, next) {
	// If table doesn't exist, send error
	if (!req.query) {
        req.query = '';
    }
	
	// Parse query into AST
	var ast = parser.parse(req.query);
	
	// Process SELECT columns
	//ast.columns = processSelect(ast.columns, tables[req.params.table]);
	
	// Add FROM table to AST
	ast.from = [{table: '"' + req.params.table + '"'}];
	
	// Process WHERE recursively
	if(ast.where) ast.where = processWhere(ast.where);
	
	// Convert AST back to SQL
	var sql = parser.stringify.parse(ast);
	
    var url = 'https://'+req.params.user+'.cartodb.com/api/v2/sql?q='+encodeURIComponent(sql);
    console.log(url);
    console.log(sql);
    request(url, function (error, response, body) {
      console.log(body);
      if (!error && response.statusCode == 200) {
        var data = JSON.parse(body);
        data['sql'] = sql;
        res.json(data);
        next();
      } else {
        res.json(JSON.parse(body));
        next();  
      }
    })
	
	
});


	
server.listen(server_port, server_ip_address, function() {
    console.log('%s listening at %s', server.name, server.url);
});
