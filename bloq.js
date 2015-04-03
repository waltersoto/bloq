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

            if (usingInline) {

                for (var inl = 0, inlMax = lst.length; inl < inlMax; inl++) {

                    if (repository.constructor === Array) {
                        for (var ri = 0, rm = repository.length; ri < rm; ri++) {
                            if (validTemplate(repository[ri])) {
                                if (repository[ri].name === lst[inl]) {
                                    templateList.push(repository[ri]);
                                    break;
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
        assignRepo(repo);

        return new loadEvents();
    };

    var bindEvents = function (bindings) {

        this.alternate = function (templates, templateSource) {

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

    if (!global.bloq) {
        global.bloq = bloq;
    }

})(window);