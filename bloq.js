/*
The MIT License (MIT)

Copyright (c) 2014 Walter M. Soto Reyes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
(function (global) {

    
    function escapeRegExp(string) {
        return  string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    var replaceAll = function (find, replace, text) { 
        return text.replace(new RegExp(escapeRegExp(find), "g"), replace);
    }
     
    var toDom = function (txt) { 
        var temp = document.createElement("div");
        temp.innerHTML = txt; 
        return temp.firstChild;
    };

    var where = function (arr, fn) {
        var sub = [];
        (function (a) {
            for (var i = 0, max = a.length; i < max; i++) {
                if (fn(arr[i], i)) {
                    sub.push(arr[i]);
                }
            }
        })(arr);
        return sub;
    };

    var ajax = function(p) {
        (function (xH) {
           
            xH.onreadystatechange = function () {

                if (xH.readyState === 4) {
                    if (xH.responseText.length > 0) { 
                        if (xH.status === 200) {
                            if (typeof p.callback === "function") {
                                p.callback(xH.responseText);
                            }
                        }
                    } 
                    xH = null; 
                }
            };

            xH.open("GET", p.url, true);
            xH.send(null);

        })(new XMLHttpRequest());
    };

    var fetch = function (id,templateUrl, callback, asText) {
        ajax({
            url: templateUrl,
            callback: function (html) {
                if (typeof callback === "function") {
                    if (typeof asText === "undefined") {
                        callback(toDom(html));
                    }
                    callback(html,id);
                }

            }
        });
    };

    var validTemplatedList = function (o) { 
        if (o.hasOwnProperty("template") && o.hasOwnProperty("data")) {
            return (o.data.constructor === Array);
        }
        return false;
    }

    var validInline = function(o) {
        return o.hasOwnProperty("name") && o.hasOwnProperty("text");
    }

    var templates = [];
    var preloaded = false;

    var load = function (name, callback, asText) {
        ///	<summary>
        ///	Load template as text with data biding
        ///	</summary>
        ///	<param name="name" type="string">
        ///	 Name of the template file
        ///	</param>  
        ///	<param name="callbacks" type="function">
        ///	 Function that will receive a template instance. (ex. function(html){})
        ///	</param>

        var done = false;

        if (typeof asText === "undefined") {
            asText = false;
        }

        if (preloaded) {
            var sel = where(templates, function (o) {
                return o.name === name;
            });

            if (sel.length > 0) {
                done = true;
                if (typeof callback === "function") {
                    callback(asText ? sel[0].text : toDom(sel[0].text)); 
                }
            }
        }

        if (!done) {
            fetch(name, this.repository + name, callback,asText);
        }
    };


    var bloq = { 
        repository: "",
        inline: function (list, callback) {
            ///	<summary>
            ///	Preload inline templates (not from external files)
            ///	</summary>
            ///	<param name="list" type="array">
            ///	 Array of inline templates (ex.[{ name:'template1',text:'hello {name}'},{name:'template2',text:'hi {name}'}] )
            ///	</param> 
            ///	<param name="callback" type="function">
            ///	 Function to be executed after all templates are loaded
            ///	</param>

            for (var i = 0, max = list.length; i < max; i++) {
                if (validInline(list[i])) {
                    templates.push(list[i]);
                }  
            }
            preloaded = templates.length > 0;
            if (typeof callback === "function") {
                callback();
            }
        },
        preload: function (repository, list, callback) {
            ///	<summary>
            ///	Preload external templates
            ///	</summary>
            ///	<param name="repository" type="string">
            ///	 Path to the template folder
            ///	</param> 
            ///	<param name="list" type="array">
            ///	 Array of template filenames
            ///	</param> 
            ///	<param name="callback" type="function">
            ///	 Function to be executed after all templates are loaded
            ///	</param>
            if (repository.length > 0 && repository.substring(repository.length - 1) === "\\") {
                repository = repository.substring(0, repository.length - 1);
            }

            if (repository.length > 0 && repository.substring(repository.length - 1) !== "/") {
                repository = repository + "/";
            }
            this.repository = repository;
            var processed = 0;
            for (var i = 0, max = list.length; i < max; i++) {
                fetch(list[i],this.repository + list[i], function (html,n) {
                    templates.push({
                        name: n,
                        text: html
                    });
                    processed++;
                    if (processed === max) {
                        preloaded = templates.length > 0;
                        if (typeof callback === "function") {
                            callback();
                        }
                    }
                },true);
            }
        },
        templates: function () {
            ///	<summary>
            ///	Returns array with preloaded templates
            ///	</summary>
            return templates;
        },
        load: function (name, callback) {
            ///	<summary>
            ///	Load a template
            ///	</summary>
            ///	<param name="name" type="string">
            ///	 Name of the template file
            ///	</param>  
            ///	<param name="callback" type="function">
            ///	 Function that will receive a binded template array. (ex. function(html[]){})
            ///	</param>

            load(name, callback);


        },
        bind: function (name, bindings, callback) {
            ///	<summary>
            ///	Load template as text with data biding
            ///	</summary>
            ///	<param name="name" type="string">
            ///	 Name of the template file
            ///	</param> 
            ///	<param name="bindings" type="json">
            ///	 Data to bind. (ex. [{'label1':'data'},{'label2','data'}]
            ///	</param> 
            ///	<param name="callbacks" type="function">
            ///	 Function that will receive and array of template instances. (ex. function(html[]){})
            ///	</param>  

            load(name, function(html) {
                
                if (typeof bindings !== "undefined") {

                    var items = [];

                    for (var i = 0, max = bindings.length; i < max; i++) {
                        var temp = html;
                       
                        for (var p in bindings[i]) {
                            if (bindings[i].hasOwnProperty(p)) { 
                                temp = replaceAll("{" + p + "}", bindings[i][p], temp);
                            }
                        } 
                        items.push(toDom(temp));
                    }

                    if (typeof callback === "function") {
                        callback(items);
                    }

                }

            }, true);


        },
        bindList: function (bindList, callback) {
            ///	<summary>
            ///	Bind to a list with multiple templates
            ///	</summary>  
            ///	<param name="bindList" type="json">
            ///	 Data to bind. (ex. [{template:'templateFile.html',data:[{'label1':'data'},{'label2','data'}]}]
            ///  binding item must implement a text field called "template" and array field called "data".
            ///	</param> 
            ///	<param name="callback" type="function">
            ///	 Function that will receive a binded template array. (ex. function(html[]){})
            ///	</param>  

            if (typeof bindList !== "undefined"
             && bindList !== null) {

                        var items = [];

                        for (var i = 0, max = bindList.length; i < max; i++) {

                            var t = bindList[i];
                            if (validTemplatedList(t)) {

                                this.bind(t.template, t.data,
                                    function (html) {
                                         for (var a = 0, amx = html.length; a < amx; a++) {
                                            items.push(html[a]);   
                                         } 
                                    });

                            }

                        }

                        if (typeof callback === "function") {
                            callback(items);
                        }
                    }

        }
    };


    

    if (!global.bloq) {
        global.bloq = bloq;
    }


})(window);