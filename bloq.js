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

    var FUNCTION = "function";
    var UNDEFINED = "undefined";
    var EVT_BIND_TO = "bind-to";
    var EVT_BIND_ALTERNATE = "bind-alternate";
    var EVT_LOAD_WITH = "load-with";
    var EVT_LOAD = "load";
    var EVT_LIST = "load-list";
    var XML_ROOT = "templates";
    var XML_CHILD = "template";

    var escapeRegExp = function (string) {
        return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    var trim = function (str) {
        return str.replace(/^\s+|\s+$/g, "");
    }
    var autoBlank = function (txt) {
        return (typeof txt === "undefined" || txt === null) ? "" : txt;
    }
    var replaceAll = function (find, replace, text) { 
        return text.replace(new RegExp(escapeRegExp(find), "g"), replace);
    }

    var removeChildren = function(element) {
        if (element.hasChildNodes()) {
            while (element.childNodes.length >= 1) {
                element.removeChild(element.firstChild);
            } 
        }
    };

    var validListItem = function (o) {
        if (o.hasOwnProperty("template") && o.hasOwnProperty("data")) {
            return (o.data.constructor === Array);
        }
        return false;
    }

    var validTemplate = function (o) {
        return o.hasOwnProperty("name") && o.hasOwnProperty("text");
    }

    var toLower = function (txt) {
        if (typeof txt !== "undefined" && txt !== null) {
            return txt.toLowerCase();
        }

        return "";
    };

    var toDom = function (txt) {
        var temp = document.createElement("div");
        temp.innerHTML = trim(txt);
        return temp.firstChild;
    };

    function parseXml(text) {
        var xmlDoc;
        if (window.DOMParser) {
            var xmlParser = new DOMParser();
            xmlDoc = xmlParser.parseFromString(text, "text/xml");
        } else {
            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(text);
        }
        return xmlDoc;
    }

    var onload = function (callback) {
        var current = window.onload;
        if (typeof window.onload !== FUNCTION) {
            window.onload = callback;
        } else {
            if (typeof callback === FUNCTION) {
                window.onload = function () {
                    if (current) {
                        current();
                    }
                    callback();
                };
            }
        }
    };

    var readyExecuted = false;
    var onReady = null;
    var ready = function (callback) {
        ///	<summary>
        /// Execute callback function when DOM is ready
        ///	</summary>
        ///	<param name="callback" type="function">
        /// Function to execute.
        ///	</param>
        if (typeof onReady !== FUNCTION) {
            onReady = callback;
        } else {
            var current = onReady;
            onReady = function () {
                if (current) {
                    current();
                }
                callback();
            };
        }

        if (document.addEventListener) {
            document.addEventListener("DOMContentLoaded", function () {
                if (!readyExecuted) {
                    onReady();
                    readyExecuted = true;
                }
            }, false);
        } else {
            onload(callback);
        }
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

    var getTemplates = function (lst) {
        var result = [];
        if (lst !== null
            && typeof lst !== "undefined"
            && lst.constructor === Array) {
            for (var i = 0, max = lst.length; i < max; i++) {
                if (lst[i].hasOwnProperty("template")) {
                    if (typeof lst[i].template !== "undefined"
                        && lst[i].template !== null) {
                        result.push(lst[i].template);
                    }
                }
            }
        }
        return result;
    };

    var hasExtension = function (filename, ext) {
        if (typeof filename === "undefined" || filename === null) {
            return false;
        }
        return filename.toLowerCase().split(".").pop() === ext;
    };

    var usingInline = false;
    var templateList = [];

    var hasTemplate = function (template) {

        var sel = where(templateList, function (o) {

            return o.name === (validTemplate(template)
                              ? template.name : template);
        });

        return sel.length > 0;
    };

    var addTemplate = function (template) {
        if (!hasTemplate(template)) {
            templateList.push(template);
        }
    };

    var req = function (p) {
        (function (xH) {

            xH.onreadystatechange = function () {

                if (xH.readyState === 4) {
                    if (xH.responseText.length > 0) {
                        if (xH.status === 200) {
                            if (typeof p.callback === FUNCTION) {
                                p.callback(xH.responseText);
                            }
                        } else {
                            if (typeof p.error === FUNCTION) {
                                p.error(xH.status, xH.statusText);
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
     
    var fetch = function (id, templateUrl, callback, asText) {
        if (id === null || !hasTemplate(id)) {
            req({
                url: templateUrl,
                callback: function (html) {
                    if (typeof callback === FUNCTION) {
                        if (typeof asText === "undefined") {
                            callback(toDom(html));
                        }
                        callback(html, id);
                    }
                }
            });
        }
    };

    var repository = "";
    var hasPreloaded = false;
    var thenQueue = {};
    var thenEvents = function (location, html) {
        this.then = function (callback) {
            if (hasPreloaded) {
                if (typeof callback === FUNCTION) {
                    if (typeof html !== "undefined") {
                        callback(html);
                    } else {
                        callback();
                    }
                }
            } else {
                if (typeof callback === FUNCTION) {
                    thenQueue[location] = callback;
                }
            }
        };
    };

    var assignRepo = function (repo) {

        if (repo.constructor === Array) {
            usingInline = true;
        } else {
            usingInline = false;
            if (repo.length > 0 && repo.substring(repo.length - 1) === "\\") {
                repo = repo.substring(0, repo.length - 1);
            }

            if (repo.length > 0 && repo.substring(repo.length - 1) !== "/") {
                repo = repo + "/";
            }

        }

        repository = repo;
    };

    var loadEvents = function () {


        this.with = function (lst) {
            /// <signature>
            ///   <summary>Template list</summary>
            ///   <param name="lst" type="array">Array of template names (ex. ["template1","teamplate2"])</param> 
            /// </signature>
            /// <signature>
            ///   <summary>Template xml</summary>
            ///   <param name="lst" type="string">XML filename</param> 
            /// </signature>
            /// <signature>
            ///   <summary>Javascript Array</summary>
            ///   <param name="lst" type="array">Name of the javascript array that holds the templates (ex. [{ name:"templatename", text:"template content"}]).</param> 
            /// </signature>

            if (usingInline) {

                if (repository.constructor === Array) {

                if (lst.constructor !== Array) {
                    for (var ri = 0, rm = repository.length; ri < rm; ri++) {
                        if (validTemplate(repository[ri])) {
                            if (repository[ri].name === lst || lst === "*") {
                                templateList.push(repository[ri]);
                                if (lst !== "*") {
                                    break;
                                }
                            }
                            
                        }
                    }
                } else {
                    
                    for (var inl = 0, inlMax = lst.length; inl < inlMax; inl++) {
                            for (ri = 0, rm = repository.length; ri < rm; ri++) {
                                if (validTemplate(repository[ri])) {
                                    if (repository[ri].name === lst[inl]) {
                                        templateList.push(repository[ri]);
                                        break;
                                    }

                                }
                            }
                        }
                }

                }


                hasPreloaded = templateList.length > 0;
                if (typeof thenQueue[EVT_LOAD_WITH] === FUNCTION) {
                    thenQueue[EVT_LOAD_WITH]();
                }

            } else if (lst.constructor !== Array && hasExtension(lst, "xml")) {
                fetch(null, repository + lst, function (text) {

                    if (typeof text !== "undefined"
                        && text !== null
                        && text.length > 0) {

                        var xml = parseXml(text);

                        if (xml.hasChildNodes()
                            && toLower(xml.firstChild.localName) === XML_ROOT) {
                            var tpls = xml.firstChild;
                            if (tpls.hasChildNodes()) {
                                for (var tpl = 0, tplM = tpls.childNodes.length;
                                    tpl < tplM; tpl++) {
                                    if (toLower(tpls.childNodes[tpl].localName) === XML_CHILD) {
                                        var child = tpls.childNodes[tpl];
                                        var name = "generic-" + tpl;
                                        var templateContent = "";
                                        if (child.hasAttributes()) {
                                            name = child.attributes.getNamedItem("name").value;
                                        }
                                        if (child.hasChildNodes()) {
                                            for (var cld = 0, cldm = child.childNodes.length; cld < cldm; cld++) {
                                                if (toLower(child.childNodes[cld].nodeName) === "#cdata-section") {
                                                    templateContent = child.childNodes[cld].nodeValue;
                                                }
                                            }
                                        }

                                        if (templateContent.length > 0) {
                                            addTemplate({
                                                name: name,
                                                text: trim(templateContent)
                                            });
                                        }
                                    }
                                }

                                hasPreloaded = templateList.length > 0;
                                if (typeof thenQueue[EVT_LOAD_WITH] === FUNCTION) {
                                    thenQueue[EVT_LOAD_WITH]();
                                }

                            }
                        }

                    }


                }, false);
            } else {

                var processed = 0;
                for (var i = 0, max = lst.length; i < max; i++) {
                    fetch(lst[i], repository + lst[i], function (html, name) {
                        addTemplate({
                            name: name,
                            text: trim(html)
                        });
                        processed++;
                        if (processed === max) {
                            hasPreloaded = templateList.length > 0;
                            if (typeof thenQueue[EVT_LOAD_WITH] === FUNCTION) {
                                thenQueue[EVT_LOAD_WITH]();
                            }
                        }
                    }, true);
                }

            }

            return new thenEvents(EVT_LOAD_WITH);

        }
    };

    var load = function (name, asText) {
        ///	<summary>
        ///	Load template as text with data biding
        ///	</summary>
        ///	<param name="name" type="string">
        ///	 Name of the template file
        ///	</param>  
        ///	<param name="callbacks" type="function">
        ///	 Function that will receive a template instance. (ex. function(html){})
        ///	</param>

        var then = new thenEvents(EVT_LOAD);
        var done = false;

        if (typeof asText === "undefined") {
            asText = false;
        }

        if (hasPreloaded) {
            var sel = where(templateList, function (o) {
                return o.name === name;
            });

            if (sel.length > 0) {
                done = true;
                then = new thenEvents(EVT_LOAD, asText ? sel[0].text : toDom(sel[0].text));
            }
        }

        if (!done) {
            fetch(name, repository + name, function (html) {
                if (typeof thenQueue[EVT_LOAD] === FUNCTION) {
                    thenQueue[EVT_LOAD](asText ? html : toDom(html));
                }
            }, asText);
        }

        return then;
    };

    var loadFrom = function (repo) {
        ///	<summary>
        ///	Set repositiory location and allow the with() method to preload the templates.
        ///	</summary>
        ///	<param name="repo" type="string">
        ///	 Repository location
        ///	</param>

        assignRepo(repo);

        return new loadEvents();
    };

    var bindEvents = function (bindings) {

        this.alternate = function (templates, templateSource) {
            /// <signature>
            ///   <summary>Bind data alternating between templates</summary>
            ///   <param name="templates" type="array">Array of template names (ex. ["template1","teamplate2"])</param> 
            /// </signature>
            /// <signature>
            ///   <summary>Bind data alternating between templates</summary>
            ///   <param name="template" type="array">Array of template names (ex. ["template1","teamplate2"])</param>
            ///   <param name="templateSource" type="string">Array of template names (ex. templates.xml )</param>
            /// </signature>

            var items = [];

            if (templates.constructor === Array) {

                var reqTemplates = templates;
                if (typeof templateSource !== "undefined") {
                    reqTemplates = templateSource;
                }

                loadFrom(repository)
                    .with(reqTemplates)
                    .then(function () {

                        var templateN = templates.length;
                        var current = 0;
                        if (bindings !== null
                            && typeof bindings !== "undefined"
                            && templateN > 0) {

                            for (var i = 0, max = bindings.length; i < max; i++) {

                                (function (oi) {
                                    if (current >= templateN) {
                                        current = 0;
                                    }
                                    load(templates[current], true).then(function (html) {

                                        current++;

                                        var temp = html;

                                        for (var p in bindings[oi]) {

                                            if (bindings[oi].hasOwnProperty(p)) {
                                                temp = replaceAll("{" + p + "}", autoBlank(bindings[oi][p]), autoBlank(temp));
                                            }

                                        }

                                        items.push(toDom(temp));

                                        if (typeof thenQueue[EVT_BIND_ALTERNATE] === FUNCTION) {
                                            thenQueue[EVT_BIND_ALTERNATE](items);
                                        }
                                    });

                                })(i);

                            }
                        }

                    });


            }

            return new thenEvents(EVT_BIND_ALTERNATE, items);
        };

        this.to = function (template) {

            var items = [];

            if (template.constructor === Array) {

                for (var t = 0, tmax = template.length; t < tmax; t++) {
                    load(template[t], true).then(function (html) {

                        if (bindings !== null
                                    && typeof bindings !== "undefined") {

                            for (var i = 0, max = bindings.length; i < max; i++) {
                                var temp = html;

                                for (var p in bindings[i]) {
                                    if (bindings[i].hasOwnProperty(p)) {
                                        temp = replaceAll("{" + p + "}", autoBlank(bindings[i][p]), autoBlank(temp));
                                    }
                                }
                                items.push(toDom(temp));
                            }

                            if (typeof thenQueue[EVT_BIND_TO] === FUNCTION) {
                                thenQueue[EVT_BIND_TO](items);
                            }

                        }

                    });
                }

            } else {

                load(template, true).then(function (html) {

                    if (bindings !== null
                                && typeof bindings !== "undefined") {

                        for (var i = 0, max = bindings.length; i < max; i++) {
                            var temp = html;

                            for (var p in bindings[i]) {
                                if (bindings[i].hasOwnProperty(p)) {
                                    temp = replaceAll("{" + p + "}", autoBlank(bindings[i][p]), autoBlank(temp));
                                }
                            }
                            items.push(toDom(temp));
                        }

                        if (typeof thenQueue[EVT_BIND_TO] === FUNCTION) {
                            thenQueue[EVT_BIND_TO](items);
                        }

                    }

                });

            }

            return new thenEvents(EVT_BIND_TO, items);
        };
    };

    var bind = function (bindings) {

        return new bindEvents(bindings);

    };

    var list = function (bindList, templateSource) {

        var items = [];

        if (typeof bindList !== "undefined"
           && bindList !== null) {

            var reqTemplates = getTemplates(bindList);
            if (typeof templateSource !== "undefined") {
                reqTemplates = templateSource;
            }

            loadFrom(repository)
                .with(reqTemplates)
                .then(function () {

                    for (var i = 0, max = bindList.length; i < max; i++) {

                        (function (t) {
                            if (validListItem(t)) {
                                bind(t.data)
                                    .to(t.template)
                                    .then(function (html) {
                                        for (var a = 0, amx = html.length; a < amx; a++) {
                                            items.push(html[a]);
                                        }
                                    });
                            }
                        })(bindList[i]);


                    }
                    if (typeof thenQueue[EVT_LIST] === FUNCTION) {
                        thenQueue[EVT_LIST](items);
                    }

                });

        }

        return new thenEvents(EVT_LIST, items);
    };

    var bloq = {
        ready: ready,
        templates: function () {
            return templateList;
        },
        fromRepo: function (repo) {
            ///	<summary>
            ///	Set repositiory location without preloading the templates.
            ///	</summary>
            ///	<param name="repo" type="string">
            ///	 Repository location
            ///	</param>
            assignRepo(repo);
            return this;
        },
        list: list,
        loadFrom: loadFrom,
        read: function (template, parameters) {
            if (typeof parameters === "undefined" || parameters === null) {
                parameters = {};
            }
            var asText = false;
            if (repository === null || typeof repository === "undefined" || repository.length === 0) {

                if (parameters.hasOwnProperty("repo")) {
                    assignRepo(parameters.repo);
                } else if (parameters.hasOwnProperty("repository")) {
                    assignRepo(parameters.repository);
                } else {
                    //Assume root
                    repository = "./";
                }
            }

            if (parameters.hasOwnProperty("asText")) {
                asText = parameters.asText;
            }

            return load(template, asText);
        },
        bind: bind
    };
     

    //#region "Binder" 
       
    var ATT = {
        BLOCK: "bloq-area",
        PROPERTY: "bloq-field",
        TEMPLATE: "bloq-template",
        REPEATER: "bloq-repeat"
    };

    var TAG = {
        INPUT: "input",
        RADIO: "radio",
        TEXT_AREA: "textarea",
        SELECT: "select"
    }

    var setName = "";

    var select = function (parent, query) {
        if (parent !== null && typeof parent !== UNDEFINED) {
            return parent.querySelectorAll(query);
        }
        return null;
    };

    var processDefined = function (json, elem, arr) {
        for (var i = 0, max = arr.length; i < max; i++) {
            var c = trim(arr[i]);
            if (json.hasOwnProperty(c)) {
                if (typeof (json[c]) !== UNDEFINED) {
                    var currentTxt = elem.innerHTML;
                    elem.innerHTML = replaceAll("{" + c + "}",
                        typeof json[c] === FUNCTION ? json[c]() : json[c]
                        , currentTxt);
                }
            }
        }
    };

    var getNode = function (nodeName) {
        var nodes = document.querySelectorAll("[" + ATT.BLOCK + "=" + nodeName + "]");
        if (typeof nodes !== UNDEFINED && nodes !== null && nodes.length > 0) {
            return nodes[0];
        }
        return null;
    };

    var getNodeProperties = function () {

        var container = getNode(setName);

        var nodeList = select(container, "[" + ATT.PROPERTY + "]");

        return nodeList;
    };

    var repeateIt = function (parent, child, obj) {
        for (var p in obj) {

            if (obj.hasOwnProperty(p)) {

                if (typeof (obj[p]) !== UNDEFINED) {

                    var currentTxt = child.innerHTML;
                    child.innerHTML = replaceAll("{" + p + "}",
                        (typeof obj[p] === FUNCTION) ? obj[p]() : obj[p]
                        , currentTxt); 

                }
            }

        }

        parent.appendChild(child);


    };

    var parent = null;
    var template = null;
    var original = null;

    var repeatFn = function (set) {

        this.to = function (name) {
            if (parent === null) {
                parent = getNode(setName);
            } 
           
            if (parent !== null && typeof parent !== UNDEFINED) {
                if (template === null) {
                    var holdTemplate = select(parent, "[" + ATT.REPEATER + " = " + name + "]");
                    if (holdTemplate.length > 0) {
                        template = holdTemplate[0];
                    }
                }
                
                if (template !== null && typeof template !== UNDEFINED) {
                    
                    if (original === null) {
                        if (template.firstElementChild) {
                          original = template.firstElementChild.cloneNode(true); 
                        }   

                    }

                    removeChildren(template);

                    if (set.constructor === Array) {
                        for (var s = 0, sm = set.length; s < sm; s++) {
                            repeateIt(template, original.cloneNode(true), set[s]);
                        }

                    }

                   
                }
            }
        }
    };

    var formatField = function(txt, format) {

        if (format.length > 0) {
            if (format.substr(0, 1) === "#") {
                
                if (format.indexOf("#UPPER") !== -1) {
                    return txt.toUpperCase();
                }

                if (format.indexOf("#LOWER")) {
                    return txt.toLowerCase();
                }
            }
        }

       return replaceAll("{0}", txt, format);
    };

    var repeat = function (set) {
        return new repeatFn(set);
    };

    var fn = function (name) {

        setName = name;

        this.repeat = repeat;

        this.take = function () {

            var set = {
            };

            var nodes = getNodeProperties(setName);
            if (typeof nodes !== "undefined" && nodes !== null && nodes.length > 0) {
                for (var i = 0; i < nodes.length; i++) {
                    var propName = nodes[i].attributes.getNamedItem(ATT.PROPERTY).value;

                    switch (nodes[i].tagName.toLowerCase()) {
                        case TAG.TEXT_AREA:
                        case TAG.INPUT:
                            var type = nodes[i].type;
                            switch (type.toLowerCase()) {
                                case TAG.RADIO:
                                    if (nodes[i].checked) {
                                        set[propName] = nodes[i].value;
                                    }
                                    break;
                                default:
                                    set[propName] = nodes[i].value;
                                    break;
                            }
                            break;
                        case TAG.SELECT:
                            if (typeof nodes[i].selectedIndex !== "undefined"
                                && nodes[i].selectedIndex !== -1) {
                                if (nodes[i].multiple) {
                                    var v = [];
                                    for (var oi = 0, m = nodes[i].length; oi < m; oi++) {
                                        if (nodes[i].options[oi].selected) {
                                            v.push(nodes[i].options[oi].value);
                                        }
                                    }
                                    set[propName] = v;
                                } else {
                                    set[propName] = nodes[i].options[nodes[i].selectedIndex].value;
                                }
                            }
                            break;
                        default:
                            if (typeof (nodes[i].innerHTML) !== "undefined") {
                                set[propName] = nodes[i].innerHTML;
                            }

                            break;
                    }
                }
            }

            return set;
        };

        this.put = function (json) {

            var container = getNode(setName);

            if (container !== null) {

                //Process templates
                var templates = container.querySelectorAll("[" + ATT.TEMPLATE + "]");
                var processAll = [];
                if (templates.length > 0) {
                    for (var t = 0, tmax = templates.length; t < tmax; t++) {
                        var elem = templates[t].getAttribute(ATT.TEMPLATE);
                        if (trim(elem) === "*") {
                            processAll.push(templates[t]);
                        } else {
                            var fieldsArr = elem.split(",");
                            processDefined(json, templates[t], fieldsArr);
                        }
                    }
                }

                for (var p in json) {
                    if (json.hasOwnProperty(p)) {
                        if (typeof (json[p]) !== UNDEFINED) {

                            for (var all = 0, allMax = processAll.length; all < allMax; all++) {
                                var currentTxt = processAll[all].innerHTML;
                                processAll[all].innerHTML = replaceAll("{" + p + "}",
                                    (typeof json[p] === FUNCTION) ? json[p]() : json[p]
                                    , currentTxt);
                            }

                            var element = container.querySelectorAll("[" + ATT.PROPERTY + "=" + p + "]");

                            if (typeof element !== UNDEFINED && element.length > 0) {
                               
                                for (var i = 0, max = element.length; i < max; i++) {
                                    var format = "";
                                   
                                    var current = (typeof json[p] === FUNCTION) ? json[p]() : json[p];

                                    if (element[i].getAttribute("bloq-format")) {
                                        format = element[i].getAttribute("bloq-format");
                                        current = formatField(current, format);
                                    }

                                    switch (element[i].tagName.toLowerCase()) {
                                        case TAG.TEXT_AREA:
                                        case TAG.INPUT:
                                            if (element[i].type.toLowerCase() === TAG.RADIO) {
                                                for (var ri = 0, rm = element.length; ri < rm; ri++) {
                                                    if (element[ri].value.toLowerCase() === current.toLowerCase()) {
                                                        element[ri].checked = true;
                                                    }
                                                }
                                            } else {
                                                element[i].value = current;
                                            }

                                            break;
                                        case TAG.SELECT:

                                            if (json[p].constructor !== Array) {
                                                for (var oi = 0, m = element[0].length; oi < m; oi++) {
                                                    if (element[i].options[oi].value.toLowerCase() === current.toLowerCase()) {
                                                        element[i].options[oi].selected = true;
                                                    }
                                                }
                                            } else {
                                                for (var ji = 0, jm = json[p].length; ji < jm; ji++) {
                                                    for (oi = 0, m = element[i].length; oi < m; oi++) {
                                                        if (element[i].options[oi].value.toLowerCase() === current.toLowerCase()) {
                                                            element[i].options[oi].selected = true;
                                                        }
                                                    }
                                                }
                                            }
                                            break;
                                        default:
                                            if (typeof (element[i].innerHTML) !== UNDEFINED) {
                                                element[i].innerHTML = current;
                                            }

                                            break;
                                    }

                                }

                            }


                        }
                    }
                }//json

            }

            return this;
        };

    };

    var bloqFn = function (name) {
        return new fn(name);
    };

    bloqFn.extend = function (extension) {
        ///	<summary>
        ///	Extend the object literal.
        ///	</summary>
        ///	<param name="extension" type="object">
        ///	 Object to be attached
        ///	</param>
        for (var p in extension) {
            if (extension.hasOwnProperty(p)) {
                if (typeof (extension[p]) !== UNDEFINED) {
                    bloqFn[p] = extension[p];
                }
            }
        }
    };

    bloqFn.extend(bloq);

    //#endregion


    if (!global.bloq) { 
        global.bloq = global["bloq"] = bloqFn;
    }

})(window);