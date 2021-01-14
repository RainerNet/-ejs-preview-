
/*
 * jLinq - 3.0.1
 * Hugo Bonacci - hugoware.com
 * http://creativecommons.org/licenses/by/3.0/
 */

var jLinq;
var jlinq;
var jl;
(function() {

    //jLinq functionality
    var framework = {
    
        //command types for extensions
        command:{
        
            //queues a comparison to filter records
            query:0,
            
            //executes all queued commands and filters the records
            select:1,
            
            //performs an immediate action to the query
            action:2
        },
        
        //common expressions
        exp:{
            //gets each part of a dot notation path
            get_path:/\./g,
            
            //escapes string so it can be used in a regular expression
            escape_regex:/[\-\[\]\{\}\(\)\*\+\?\.\,\\\^\$\|\#\s]/g
        },
        
        //common javascript types
        type:{
            nothing:-1,
            undefined:0,
            string:1,
            number:2,
            array:3,
            regex:4,
            bool:5,
            method:6,
            datetime:7,
            object:99
        },
        
        //contains jLinq commands and functions
        library:{
        
            //the current commands in jLinq
            commands:{},
            
            //the type comparisons for jLinq
            types:{},
        
            //includes a comparison to identify types
            addType:function(type, compare) {
                framework.library.types[type] = compare;
            },
        
            //adds a command to the jLinq library
            extend:function(commands) {
            
                //convert to an array if not already
                if (!framework.util.isType(framework.type.array, commands)) {
                    commands = [commands];
                }
                
                //append each method
                framework.util.each(commands, function(command) {
                    framework.library.commands[command.name] = command;
                });
            
            },
            
            //starts a new jLinq query
            query:function(collection, params) {
            
                //make sure something is there
                if (!framework.util.isType(framework.type.array, collection)) {
                    throw "jLinq can only query arrays of objects.";
                }
                
                //clone the array to prevent changing objects - by default
                //this is off
                collection = params.clone || (params.clone == null && jLinq.alwaysClone)
                    ? framework.util.clone(collection) 
                    : collection;
            
                //holds the state of the current query
                var self = {
                
                    //the public instance of the query
                    instance:{
                    
                        //should this query ignore case
                        ignoreCase:jLinq.ignoreCase,
                        
                        //should the next command be evaluated as not
                        not:false,
                        
                        //the action that was last invoked
                        lastCommand:null,
                        
                        //the name of the last field queried
                        lastField:null,
                    
                        //the current records available
                        records:collection,
                    
                        //records that have been filtered out
                        removed:[],
                        
                        //tells a query to start a new function
                        or:function() { self.startNewCommandSet(); },
                        
                        //the query creator object
                        query:{}
                        
                    },
                    
                    //determines if the arguments provided meet the
                    //requirements to be a repeated command
                    canRepeatCommand:function(args) {
                        return self.instance.lastCommand != null &&
                            args.length == (self.instance.lastCommand.method.length + 1) &&
                            framework.util.isType(framework.type.string, args[0])
                    },

                    //commands waiting to execute
                    commands:[[]],
                    
                    //executes the current query and updated the records
                    execute:function() {
                        var results = [];
                        
                        //get the current state of the query
                        var state = self.instance;
                        
                        //start checking each record
                        framework.util.each(self.instance.records, function(record) {
                            
                            //update the state
                            state.record = record;

                            //perform the evaluation
                            if (self.evaluate(state)) { 
                                results.push(record); 
                            }
                            else {
                                self.instance.removed.push(record);
                            }
                        });
                        
                        //update the matching records
                        self.instance.records = results;
                    },
                    
                    //tries to find a value from the path name
                    findValue:framework.util.findValue,
                    
                    //evaluates each queued command for matched
                    evaluate:function(state) {
                        
                        //check each of the command sets
                        for (var command = 0, l = self.commands.length; command < l; command++) {
                        
                            //each set represents an 'or' set - if any
                            //match then return this worked
                            var set = self.commands[command];
                            if (self.evaluateSet(set, state)) { return true; }
                            
                        };
                        
                        //since nothing evaluated, return it failed
                        return false;
                        
                    },
                    
                    //evaluates a single set of commands
                    evaluateSet:function(set, state) {
                    
                        //check each command in this set
                        for (var item in set) {
                            if (!set.hasOwnProperty(item)) continue;
                            //get the details to use
                            var command = set[item];
                            state.value = self.findValue(state.record, command.path);
                            state.compare = function(types) { return framework.util.compare(state.value, types, state); };
                            state.when = function(types) { return framework.util.when(state.value, types, state); };
                                
                            //evaluate the command
                            try {
                                var result = command.method.apply(state, command.args);
                                if (command.not) { result = !result; }
                                if (!result) { return false; }
                            }
                            //errors and exceptions just result in a failed
                            //to evaluate as true
                            catch (e) {
                                return false;
                            }
                            
                        }
                        
                        //if nothing failed then return it worked
                        return true;
                        
                    },
                    
                    //repeats the previous command with new
                    //arguments
                    repeat:function(arguments) {
                    
                        //check if there is anything to repeat
                        if (!self.instance.lastCommand || arguments == null) { return; }
                        
                        //get the array of arguments to work with
                        arguments = framework.util.toArray(arguments);
                            
                        //check if there is a field name has changed, and
                        //if so, update the arguments to match
                        if (self.canRepeatCommand(arguments)) {
                            self.instance.lastField = arguments[0];
                            arguments = framework.util.select(arguments, null, 1, null);
                        }
                        
                        //invoke the command now
                        self.queue(self.instance.lastCommand, arguments);
                    },
                    
                    //saves a command to evaluate later
                    queue:function(command, args) {
                        self.instance.lastCommand = command;
                        
                        //the base detail for the command
                        var detail = {
                            name:command.name,
                            method:command.method,
                            field:self.instance.lastField,
                            count:command.method.length,
                            args:args,
                            not:self.not
                        };
                        
                        //check to see if there is an extra argument which should
                        //be the field name argument
                        if (detail.args.length > command.method.length) {
                        
                            //if so, grab the name and update the arguments
                            detail.field = detail.args[0];
                            detail.args = framework.util.remaining(detail.args, 1);
                            self.instance.lastField = detail.field;
                        }
                        
                        //get the full path for the field name
                        detail.path = detail.field;
                        
                        //queue the command to the current set
                        self.commands[self.commands.length-1].push(detail);

                        //then reset the not state
                        self.not = false;
                    
                    },
                    
                    //creates a new set of methods that should be evaluated
                    startNewCommandSet:function() {
                        self.commands.push([]);
                    },
                    
                    //marks a command to evaluate as NOT
                    setNot:function() {
                        self.not = !self.not;
                    }
                    
                };
                
                //append each of the functions
                framework.util.each(framework.library.commands, function(command) {
                
                    //Query methods queue up and are not evaluated until
                    //a selection or action command is called
                    if (command.type == framework.command.query) {
                        
                        //the default action to perform
                        var action = function() {
                            self.queue(command, arguments);
                            return self.instance.query;
                        };
                        
                        //create the default action
                        self.instance.query[command.name] = action;
                        
                        //orCommand
                        var name = framework.util.operatorName(command.name);
                        self.instance.query["or"+name] = function() {
                            self.startNewCommandSet();
                            return action.apply(null, arguments);
                        };
                        
                        //orNotCommand
                        self.instance.query["orNot"+name] = function() {
                            self.startNewCommandSet();
                            self.setNot();
                            return action.apply(null, arguments);
                        };
                        
                        //andCommand
                        self.instance.query["and"+name] = function() {
                            return action.apply(null, arguments);
                        };
                        
                        //andNotCommand
                        self.instance.query["andNot"+name] = function() {
                            self.setNot();
                            return action.apply(null, arguments);
                        };
                        
                        //notCommand
                        self.instance.query["not"+name] = function() {
                            self.setNot();
                            return action.apply(null, arguments);
                        };
                        
                    }
                    
                    //Selections commands flush the queue of commands
                    //before they are executed. A selection command
                    //must return something (even if it is the current query)
                    else if (command.type == framework.command.select) {
                        self.instance.query[command.name] = function() {
                        
                            //apply the current changes
                            self.execute();
                            
                            //get the current state of the query
                            var state = self.instance;
                            state.compare = function(value, types) { return framework.util.compare(value, types, state); };
                            state.when = function(value, types) { return framework.util.when(value, types, state); };
                            
                            //perform the work
                            return command.method.apply(state, arguments);
                        };
                    }
                    
                    //actions evaluate immediately then return control to
                    //the query 
                    else if (command.type == framework.command.action) {
                        self.instance.query[command.name] = function() {
                        
                            //get the current state of the query
                            var state = self.instance;
                            state.compare = function(value, types) { return framework.util.compare(value, types, state); };
                            state.when = function(value, types) { return framework.util.when(value, types, state); };
                        
                            //perform the work
                            command.method.apply(state, arguments);
                            return self.instance.query;
                        };
                    }
                
                });
                
                //causes the next command to be an 'or'
                self.instance.query.or = function() {
                    self.startNewCommandSet();
                    self.repeat(arguments);
                    return self.instance.query;
                };
                
                //causes the next command to be an 'and' (which is default)
                self.instance.query.and = function() { 
                    self.repeat(arguments); 
                    return self.instance.query;
                };
                
                //causes the next command to be a 'not'
                self.instance.query.not = function() { 
                    self.setNot();
                    self.repeat(arguments); 
                    return self.instance.query;
                };
                
                //causes the next command to be a 'not'
                self.instance.query.andNot = function() { 
                    self.setNot();
                    self.repeat(arguments); 
                    return self.instance.query;
                };
                
                //causes the next command to be a 'not' and 'or'
                self.instance.query.orNot = function() { 
                    self.startNewCommandSet();
                    self.setNot();
                    self.repeat(arguments); 
                    return self.instance.query;
                };
                
                //return the query information
                return self.instance.query;
            
            }
            
        },
        
        //variety of helper methods
        util:{
        
            //removes trailing and leading spaces from a value
            trim:function(value) {
                
                //get the string value
                value = value == null ? "" : value;
                value = value.toString();
                
                //trim the spaces
                return value.replace(/^\s*|\s*$/g, "");
            
            },
        
            //clones each item in an array
            cloneArray:function(array) {
                var result = [];
                framework.util.each(array, function(item) {
                    result.push(framework.util.clone(item));
                });
                return result;
            },
        
            //creates a copy of an object
            clone:function(obj) {
            
                //for arrays, copy each item
                if (framework.util.isType(framework.type.array, obj)) { 
                    return framework.util.cloneArray(obj);
                }
                //for object check each value
                else if (framework.util.isType(framework.type.object, obj)) {
                    var clone = {};
                    for(var item in obj) {
                        if (obj.hasOwnProperty(item)) clone[item] = framework.util.clone(obj[item]);
                    }
                    return clone;
                }
                //all other types just return the value