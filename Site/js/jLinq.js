
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