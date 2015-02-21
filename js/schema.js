// digitopia/schema.js
// status: api unstable
// version: 0.1

/*
    Copyright (C) 2014 Michael Rhodes

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

function digitopiaSchemaDbConnectorLocal(dataHandle, options) {
	var self = this;

	this.data = dataHandle;
	this.options = options;
	
	if(!this.data['__nextRowId']) {
		this.data['__nextRowId'] = {};
	}
	
	this.connect = function(tables, done) {
		for(var table in tables) {
			var err = this.tableDefined(table);
			if(err) {
				return done(error);
			}
			for(var column in table.columns) {
				err = this.columnDefined(table,column);
				if(err) {
					return done(error);
				}
			}
		}
		done(null);
	};
	
	this.disconnect = function(done) {
	};
	
	this.getRowId = function(tableName,done) {		
		done(null, ++this.data['__nextRowId'][tableName]);
	};

	this.tableDefined = function(tableName) {
		if(!this.data[tableName]) {
			this.data[tableName] = {};
		}
		if(!this.data['__nextRowId'][tableName]) {
			this.data['__nextRowId'][tableName] = 0;
		}	
		return null;
	};

	this.columnDefined = function(tableName,columnName) {
		return null;
	};

	/*
		query {
			columnname: {op:'=', value:'some value'}
		}
	*/
	this.onSearch = function(tableName, query, done) {
		var result = [];
		for(var row in this.data[tableName]) {
			data = this.data[tableName][row];	
			for(var subquery in query) {
				switch(query[subquery].operator) {
					case '=':
						if(data[subquery] == query[subquery].value) {
							result.push(data);
						}
						break;
					case '>':
						if(data[subquery] > query[subquery].value) {
							result.push(data);
						}
						break;
					case '>=':
						if(data[subquery] >= query[subquery].value) {
							result.push(data);
						}
						break;
					case '<':
						if(data[subquery] < query[subquery].value) {
							result.push(data);
						}
						break;
					case '<=':
						if(data[subquery] <= query[subquery].value) {
							result.push(data);
						}
						break;
				}
			}
		}
		done(null,result);
	};
	
	this.onCreate = function(tableName, data, done) {
		this.getRowId(tableName, function(err,rowId) {
			data.id = rowId;
			self.data[tableName][rowId] = data;
			done(null, rowId, self.data[tableName][rowId]);
		});
	};
		
	this.onRead = function(tableName, rowId, done) {
		if(this.data[tableName] && this.data[tableName][rowId]) {
			done(null, this.data[tableName][rowId]);
		}
		else {
			done('row not found',null);
		}
	};
	
	this.onUpdate = function(tableName, rowId, data, done) {
		this.data[tableName][rowId] = data;
		done(null, data);
	};
	
	this.onDelete = function(tableName, rowId, done) {
		delete this.data[tableName][rowId];
		done(null);
	};
}

function digitopiaSchemaDataTypesText(column, options) {
	self = this;
	
	this.settings = options;
	this.input = undefined;
	
	this.onCreate = function(data) {
		return data;
	};
		
	this.onRead = function(data) {
		return data;
	};
	
	this.onUpdate = function(data) {
		return data;
	};
	
	this.onDelete = function(data) {
		return data;
	};
	
	this.onChange = function() {
		var value = this.input.val();
	};
	
	this.buildUI = function(data) {
		if(this.settings.multiLine) {
			this.input = $('<textarea>');
		}
		else {
			this.input = $('<input>');
		}
		this.input.val(data);
		this.input.on('change',function() { self.onChange() });
		return input;
	};
	
	this.validateUI = function(data) {
	
		var value = this.input.val();

		if(this.settings.required) {
			if(!value) {
				return 'required';
			}
		}

		if(!this.settings.multiLine) {
			if(value.match(/(\n\r\t)/) !== null) {
				return 'invalid input';
			}
		}
		
		if(this.settings.mask) {
			if(value.match(this.settings.mask) === null) {
				return 'invalid input';
			}
		}
		
		if(this.settings.exactLength) {
			if(value.length != this.settings.exactLength) {
				return 'must be exactly ' + this.settings.exactLength + ' characters';
			}
		}
		
		if(this.settings.minLength) {
			if(value.length < this.settings.minLength) {
				return 'must be at least ' + this.settings.minLength + ' characters';
			}
		}

		if(this.settings.maxLength) {
			if(value.length > this.settings.maxLength) {
				return 'can\'t be more than ' + this.settings.maxLength + ' characters';
			}
		}
		
		return undefined;
	};
};

function digitopiaSchema(name,options,notifyChange) {
	var self = this;
	
	this.name = name;
	this.dbConnector = undefined;
	this.options = options;
	this.notifyChange = notifyChange;
	this.tables = {};

	// establish database connection
	this.connect = function(dbConnector,done) {
		this.dbConnector = dbConnector;
		this.dbConnector.connect(this.tables,done);
	};

	// shutdown connection
	this.disonnect = function(done) {
		this.dbConnector.disconnect(done);
	};
		
	// define a table
	this.defineTable = function(tableName, options) {
		if(this.tables[tableName]) {
			return 'table already defined';
		}
		else {
			var table = new digitopiaTable(self, tableName, options, function(action,table,row,column) { self.onChange(action,table,row,column); });
			self.tables[tableName] = table;			
			for(var column in options.columns) {
				err = self.tables[tableName].defineColumn(column, options.columns[column]);
				if(err) { return err; }
			}	
			return null;
		}
	};
	
	this.getTable = function(tableName) {
		return this.tables[tableName];
	};
		
	this.onChange = function(action,table,row,column) {
		if(this.notifyChange) {
			this.notifyChange(action,this,table,row,column);
		}
	};
}

function digitopiaTable(schema, name, options, notifyChange){
	var self = this;
	
	this.schema = schema;
	this.name = name;
	this.options = options;
	this.notifyChange = notifyChange;
	
	this.columns = {};
		
	this.defineColumn = function(name, options) {
		if(this.columns[name]) {
			return 'column ' + name + ' already defined';
		}
		else {
			var column = new digitopiaColumn(this, name, options, function(action,row,column) { self.onChange(action,row,column); });
			this.columns[name] = column;
			return null;
		}
	};
	
	this.createRow = function(data, done) {
		this.schema.dbConnector.onCreate(this.name, data, function(err,id,data) {
			if(!err) {
				self.onChange('create',data);
			}
			done(err,data);
		});
	};
	
	this.findRow = function(query, done) {
		this.schema.dbConnector.onSearch(this.name, query, function(err, data) {
			if(!err) {
				self.onChange('find',data);
			}
			done(err,data);
		});
	};

	this.readRow = function(rowId, done) {
		this.schema.dbConnector.onRead(this.name, rowId, done);
	};

	this.updateRow = function(row, done) {
		this.schema.dbConnector.onUpdate(this.name, row.id, row, function(err,row) {
			if(!err) {
				self.onChange('update',row);
			}
			done(err,row);
		});
	};

	this.deleteRow = function(rowId,done) {
		this.readRow(rowId,function(err,row) {
			if(err) {
				done(err,row);
			}
			else {
				self.schema.dbConnector.onDelete(self.name,row.id,function(err) {
					self.onChange('delete',row);
					done(err,row);
				});
			}
		});
	};

	this.onChange = function(action,row,column) {
		if(this.notifyChange) {
			this.notifyChange(action, this, row, column);
		}
	};
}

function digitopiaColumn(table, name, options, notifyChange){
	var self = this;
	
	this.table = table;
	this.name = name;
	this.options = options;
	this.notifyChange = notifyChange;
			
	this.onChange = function(action,row) {
		if(this.notifyChange) {
			this.notifyChange(action,row,this);
		}
	};
}

(function($){
	function digitopiaSchemaEditor(element, options) {
		this.element = $(element);
		this.id = element.id;
		var self = this;

		this.chooseTable = undefined;
		this.chooseField = undefined;
		this.search = undefined;
		
		this.settings = $.extend({
			searchView: $(this.element).data('search-view') ? $(this.element).data('search-view') : undefined,
			searchResultsView: $(this.element).data('search-results-view') ? $(this.element).data('search-results-view') : undefined,
			readView: $(this.element).data('read-view') ? $(this.element).data('read-view') : undefined,
			updateView: $(this.element).data('update-view') ? $(this.element).data('update-view') : undefined,
		}, options || {});
		
		this.start = function() {
			if(this.settings.schema) {
				this.buildTableList();
			}
		};
		
		this.stop = function() {
		};

		this.buildTableList = function() {
			this.chooseTable = $('<select name="table">');
			this.chooseTable.append('<option value="">Choose Table</option>');
			this.chooseTable.on('change', function(e) {
				var value = $(this).val();
				self.buildSearchForm(self.settings.schema.tables[tablename]);
			});

			for(var tablename in this.settings.schema.tables) {
				var option = $('<option>'+tablename+'</option>');
				option.data('table',this.settings.schema.tables[tablename]);
				this.chooseTable.append(option);
			}
			this.element.empty().append(this.chooseTable);
		};
		
		this.buildSearchForm = function(table) {
			this.chooseField = $('<select name="field">');
			this.chooseField.append('<option value="">Choose Field</option>');
			for(var columnName in table.columns) {
				var option = $('<option value="'+columnName+'">'+columnName+'</options>');
				this.chooseField.append(option);
			}
			this.element.append(this.chooseField);
			this.search = $('<input>');
			this.search.on('focusout',function() {
				self.selectRows();
			});
			this.element.append(this.search);
		};
		
		this.selectRows = function() {
			var tableName = this.chooseTable.val();
			var fieldName = this.chooseField.val();
			var search = this.search.val();

			var table = self.settings.schema.tables[tableName];
			var query = {};
			query[fieldName] = { operator: '=', value: search };
			table.findRow(query, function(err,result) {
				alert('hi');
			});
		}
	};
	
	$.fn.digitopiaSchemaEditor = GetJQueryPlugin('digitopiaSchemaEditor',digitopiaSchemaEditor);
})(jQuery);
