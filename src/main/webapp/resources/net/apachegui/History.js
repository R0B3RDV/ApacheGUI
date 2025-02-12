define([ "dojo/_base/declare",
         "dojo/dom",
         "dijit/registry",
         "dojo/on",
         "dojo/request",
         "dojo/_base/json",
         "dojo/data/ItemFileWriteStore",
         "dojox/grid/DataGrid",
         "dijit/Tooltip",
         "dijit/form/Button",
         "dojo/_base/array",
         'dojo/dom-style',
         "dojo/query",
         "dojo/dom-attr",
         "dojo/_base/xhr",
         "net/apachegui/Control",
         "dojo/io-query"
], function(declare, dom, registry, on, request, json, ItemFileWriteStore, DataGrid, Tooltip, Button, array, domStyle, query, domAttr, xhr, Control, ioQuery){
    
    declare("net.apachegui.History", null,{
        initialized: false,
        
        gridCount: 0,
        
        hosts : {
            enabled : [],
            disabled : []
        },
        
        type : {
            ENABLE: 'Enable',
            DISABLE: 'Disable'
        },

        searchEditor: null,
        graphEditor: null,
        
        init: function() {
            if(this.initialized==false) {
                            
                var historyRetention=this.getHistoryRetention();
                dom.byId('historyRetention').value=historyRetention;
            
                var historyBuffer=this.getHistoryBuffer();
                dom.byId('historyBuffer').value=historyBuffer;
            
                var currentTime = new Date();
                var month = (currentTime.getMonth() + 1).toString();
                if(month.length==1)
                    month='0' + month;
            
                var day = (currentTime.getDate()).toString();
                if(day.length==1)
                    day='0' + day;
            
                var year = (currentTime.getFullYear()).toString();
            
                var hours = (currentTime.getHours()).toString();
                if(hours.length==1)
                    hours='0' + hours;
            
                var minutes = (currentTime.getMinutes()).toString();
                if(minutes.length==1)
                    minutes='0' + minutes;
            
                var seconds = (currentTime.getSeconds()).toString();
                if(seconds.length==1)
                    seconds='0' + seconds;
            
                dom.byId('startDate').value=day +'/' + month + '/' + year;
                dom.byId('startTime').value='00:00:00';
            
                dom.byId('endDate').value=day +'/' + month + '/' + year;
                dom.byId('endTime').value=hours + ':' + minutes + ':' + seconds;

                dom.byId('graphDate').value=day +'/' + month + '/' + year;

                this.populateEnabled();
                this.populateDisabled();
                
                this.addListeners();

                this.searchEditor = CodeMirror.fromTextArea(dom.byId('search_database_textarea'), {
                    mode: 'text/x-mysql'
                });
                this.updateSearchQuery();

                this.deleteEditor = CodeMirror.fromTextArea(dom.byId('delete_database_textarea'), {
                    mode: 'text/x-mysql'
                });
                this.updateDeleteUpdate();

                this.graphEditor = CodeMirror.fromTextArea(dom.byId('graph_database_textarea'), {
                    mode: 'text/x-mysql'
                });
                this.updateGraphQuery();

                this.initialized=true;
            }
        },

        updateSearchQuery: function() {
            var that = this;

            request.get("../web/History", {
                query:     {
                    option: 'getSearchQuery',
                    startDate: dom.byId('startDate').value,
                    startTime: dom.byId('startTime').value,
                    endDate: dom.byId('endDate').value,
                    endTime: dom.byId('endTime').value,
                    host: dom.byId('host').value,
                    userAgent: dom.byId('userAgent').value,
                    requestString: dom.byId('requestString').value,
                    status: dom.byId('status').value,
                    contentSize: dom.byId('contentSize').value,
                    maxResults: dom.byId('maxResults').value
                },
                handleAs: 'json',
                sync: false,
                preventCache: true
            }).response.then(
                function(response) {
                    var query = response.data.query;
                    that.searchEditor.setValue(query);
                },
                function(error) {
                    net.apachegui.Util.alert('Error',error.response.data.message);
                }
            );

        },

        updateDeleteUpdate: function() {
            var that = this;

            request.get("../web/History", {
                query:     {
                    option: 'getDeleteUpdate',
                    startDate: dom.byId('startDate').value,
                    startTime: dom.byId('startTime').value,
                    endDate: dom.byId('endDate').value,
                    endTime: dom.byId('endTime').value,
                    host: dom.byId('host').value,
                    userAgent: dom.byId('userAgent').value,
                    requestString: dom.byId('requestString').value,
                    status: dom.byId('status').value,
                    contentSize: dom.byId('contentSize').value
                },
                handleAs: 'json',
                sync: false,
                preventCache: true
            }).response.then(
                function(response) {
                    var update = response.data.update;
                    that.deleteEditor.setValue(update);
                },
                function(error) {
                    net.apachegui.Util.alert('Error',error.response.data.message);
                }
            );

        },

        updateGraphQuery: function() {
            var that = this;

            request.get("../web/History", {
                query: {
                    option: 'getGraphQuery',
                    date: dom.byId('graphDate').value,
                    type: registry.byId('graphType').value,
                    host: dom.byId('graphHost').value,
                    userAgent: dom.byId('graphUserAgent').value,
                    requestString: dom.byId('graphRequestString').value,
                    status: dom.byId('graphStatus').value,
                    contentSize: dom.byId('graphContentSize').value
                },
                handleAs: 'json',
                sync: false,
                preventCache: true
            }).response.then(
                function(response) {
                    var query = response.data.query;
                    that.graphEditor.setValue(query);
                },
                function(error) {
                    net.apachegui.Util.alert('Error',error.response.data.message);
                }
            );

        },

        buildGraph: function(hostsArray, container, type, toggle) {
            
            var items = [];
            for(var i=0; i<hostsArray.length; i++) {
                var obj = {};
                
                obj.id = i;
                
                var NetworkInfo = hostsArray[i].NetworkInfo;
                
                var networkInfoString = '';
                var port, address;
                for(var j=0; j<NetworkInfo.length; j++) {
                    
                    port = NetworkInfo[j].port;
                    address = NetworkInfo[j].address;
                    
                    if(port == -1) {
                        if(address.indexOf(":") > -1) {
                            networkInfoString += "[" + address + "]";
                        } else {
                            networkInfoString += address;
                        }
                    } else {
                        if(address.indexOf(":") > -1) {
                            networkInfoString += "[" + address + "]:" + port;
                        } else {
                            networkInfoString += address + ":" + port;
                        }
                    }
                    
                    networkInfoString += ' ';
                }
                networkInfoString = networkInfoString.trim();
                
                obj.networkinfo = networkInfoString;
                obj.servername = hostsArray[i].ServerName;
                
                if(toggle) {
                    obj.toggle = '<input class="host_checkbox" data-index="' + i + '" name="' + type.toLowerCase() + '_' + i + '" type="checkbox"/>';
                }
                
                items.push(obj);
            }
            
            var data = {
                      identifier: "id",
                      label: "name",
                      items: items
                };
            
            
            var store = new ItemFileWriteStore({data: data});
            
            var layoutArray = [];
            
            layoutArray.push({
                      name: 'Network Info', 
                     field: 'networkinfo', 
                     width: 'auto'
                 });
            
            layoutArray.push({
                     name: 'ServerName', 
                      field: 'servername', 
                      width: 'auto'
                 });
            
            if(toggle) {
                layoutArray.push({
                     name: type, 
                      field: 'toggle', 
                      width: '60px'
                 });
            };
                        
            var layout = [layoutArray];
            
            var grid = new DataGrid({
                id: 'grid-' + this.gridCount,
                store: store,
                structure: layout,
                selectable: true,
                style: 'width:100%;',
                autoHeight:true,
                escapeHTMLInData:false,
                rowSelector: "20px"
            });
                    
            grid.placeAt(container);
            
            this.gridCount ++;
        },
        
        populateEnabled: function() {
            dom.byId("history_enable_loading_container").style.display = 'block';
            
            var enabledHostsContainer = dom.byId('history_enabled_hosts_container');
            
            array.forEach(registry.findWidgets(enabledHostsContainer), function(w) {
                w.destroyRecursive();
            });
            
            enabledHostsContainer.innerHTML = '';
            
            var that = this;
            
            request.get("../web/History", {
                query:     {
                    option: 'getEnabled'
                },
                handleAs: 'json',
                sync: false,
                preventCache: true
            }).response.then(
                function(response) {
                    dom.byId("history_enable_loading_container").style.display = 'none';
                    
                    var global = response.data.global;
                    var enabled = response.data.enabled;
                    var globalEnable = response.data.globalEnable;
                    
                    that.hosts.enabled = enabled;
                    
                    var div;
                    if(globalEnable) {
                    
                        div = document.createElement('div');
                        
                        var h4 = document.createElement('h4');
                        h4.innerHTML = 'Global ';
                        
                        div.appendChild(h4);
                        
                        var span = document.createElement('span');
                        span.className = 'warningTooltip';
                        h4.appendChild(span);
                        
                        var button = new Button({
                            label: "Disable",
                            onClick: function(){
                                that.updateGlobal(that.type.DISABLE);
                            }
                        });
                    
                        h4.appendChild(button.domNode);
                        
                        enabledHostsContainer.appendChild(div);
                        
                        new Tooltip({
                            connectId: [div.getElementsByClassName("warningTooltip")[0]],
                            label: "By disabling history Globally you will be doing the following:<br/><br/>" +
                                    "1. Disable history for any requests that do not belong to a VirtualHost.<br/>" +
                                    "2. Disable history for any VirtualHosts that do not implement their own CustomLog.<br/><br/>" +
                                    "Any hosts shown below do no implement their own CustomLog."
                        });
                        
                        that.buildGraph(global, 'history_enabled_hosts_container', that.type.DISABLE); 
                    
                    }
                    
                    var saveDisableButton = registry.byId('saveDisableButton');
                    if(enabled.length == 0) {
                        domStyle.set(saveDisableButton.domNode, 'display', 'none');
                        
                        if(!globalEnable) {
                            var p = document.createElement('p');
                            p.style.textAlign = 'center';
                            p.innerHTML = 'There are no enabled hosts for tracking.';
                            
                            enabledHostsContainer.appendChild(p);
                        }
                        
                    } else {
                        div = document.createElement('div');
                        div.innerHTML = '<h4>Non-Global <span class="warningTooltip"></span></h4>';
                        
                        enabledHostsContainer.appendChild(div);
                        
                        new Tooltip({
                            connectId: [div.getElementsByClassName("warningTooltip")[0]],
                            label: "The following hosts implement their own CustomLog. They must be disabled individually."
                        });
                        
                        that.buildGraph(enabled, 'history_enabled_hosts_container', that.type.DISABLE, true);
                        
                        domStyle.set(saveDisableButton.domNode, 'display', 'inline');
                    }
                    
                },
                function(error) {
                    net.apachegui.Util.alert('Error',error.response.data.message);
                }
            );
            
        },
        
        populateDisabled: function() {
            dom.byId("history_disable_loading_container").style.display = 'block';            
            var disabledHostsContainer = dom.byId('history_disabled_hosts_container');
            
            array.forEach(registry.findWidgets(disabledHostsContainer), function(w) {
                w.destroyRecursive();
            });
            
            disabledHostsContainer.innerHTML = '';
            
            var that = this;
            
            request.get("../web/History", {
                query:     {
                    option: 'getDisabled'
                },
                handleAs: 'json',
                sync: false,
                preventCache: true
            }).response.then(
                function(response) {
                    dom.byId("history_disable_loading_container").style.display = 'none';
                    
                    var global = response.data.global;
                    var disabled = response.data.disabled;
                    var globalEnable = response.data.globalEnable;
                    
                    that.hosts.disabled = disabled;
                    
                    var div;
                    if(!globalEnable) {
                    
                        div = document.createElement('div');
                        
                        var h4 = document.createElement('h4');
                        h4.innerHTML = 'Global ';
                        
                        div.appendChild(h4);
                        
                        var span = document.createElement('span');
                        span.className = 'warningTooltip';
                        h4.appendChild(span);

                        var button = new Button({
                            label: "Enable",
                            onClick: function(){
                                that.updateGlobal(that.type.ENABLE);
                            }
                        });
                        
                        h4.appendChild(button.domNode);
                    
                        disabledHostsContainer.appendChild(div);
                        
                        new Tooltip({
                            connectId: [div.getElementsByClassName("warningTooltip")[0]],
                            label:  "By enabling history Globally you will be doing the following:<br/><br/>" +
                                    "1. Enable history for any requests that do not belong to a VirtualHost.<br/>" +
                                    "2. Enable history for any VirtualHosts that do not implement their own CustomLog.<br/><br/>" +
                                    "Any hosts shown below do no implement their own CustomLog."
                        });
                        
                        that.buildGraph(global, 'history_disabled_hosts_container', that.type.ENABLE); 
                        
                    }
                    
                    var saveEnableButton = registry.byId('saveEnableButton');
                    if(disabled.length == 0) {
                        domStyle.set(saveEnableButton.domNode, 'display', 'none');
                        
                        if(globalEnable) {
                            var p = document.createElement('p');
                            p.style.textAlign = 'center';
                            p.innerHTML = 'All hosts are currently tracking history.';
                            
                            disabledHostsContainer.appendChild(p);
                        }
                    } else {
                        div = document.createElement('div');
                        div.innerHTML = '<h4>Non-Global <span class="warningTooltip"></span></h4>';
                        
                        disabledHostsContainer.appendChild(div);
                        
                        new Tooltip({
                            connectId: [div.getElementsByClassName("warningTooltip")[0]],
                            label: "The following hosts implement their own CustomLog. They must be enabled individually."
                        });
                        
                        that.buildGraph(disabled, 'history_disabled_hosts_container', that.type.ENABLE, true);
                        
                        domStyle.set(saveEnableButton.domNode, 'display', 'inline');
                    }
                },
                function(error) {
                    net.apachegui.Util.alert('Error',error.response.data.message);
                }
            );
        },
        
        refreshHosts: function() {
            this.populateDisabled();
            this.populateEnabled();
        },
        
        checkIfEnabled: function() {
            
            isEnabled = false;
            request.get("../web/History", {
                query:     {
                    option: 'getEnabled'
                },
                handleAs: 'json',
                sync: true,
                preventCache: true
            }).response.then(
                function(response) {
                    var enabled = response.data.enabled;
                    var globalEnable = response.data.globalEnable;
                    if(enabled.length > 0 || globalEnable) {
                        isEnabled = true;
                    }
                },
                function(error) {
                    net.apachegui.Util.alert('Error',error.response.data.message);
                }
            );
            
            return isEnabled;
        },
        
        updateGlobal: function(type) {
            
            var that = this;
            
            var sendRequest = function() {
                var thisdialog = net.apachegui.Util.noCloseDialog('Updating', 'Updating Please Wait...');
                thisdialog.show();
                
                request.post("../web/History", {
                    data:     {
                        option: 'updateGlobal',
                        type: type.toLowerCase()
                    },
                    handleAs: 'json',
                    sync: false
                }).response.then(
                    function(response) {
                        that.refreshHosts();
                        thisdialog.remove();
                    }, function(error) {
                        thisdialog.remove();
                        net.apachegui.Util.alert('Error',error.response.data.message);
                    }
                );
            };
            
            net.apachegui.Control.getInstance().isServerRunning(
                    function() {
                        net.apachegui.Util.confirmDialog(
                            "Please Confirm", 
                            "Are you sure you want to " + type.toLowerCase() + " global history?<br/>The server will be restarted to apply these changes!",
                            function confirm(conf) {
                                if(conf) {
                                    sendRequest();
                                }
                            }
                        );
                    }, 
                    function() {
                        sendRequest();
                    }
                );
        },
        
        updateNonGlobal: function(type) {
            
            var that = this;
            
            var hosts = [];
            
            if(type == this.type.DISABLE) {
                query('#history_enabled_hosts_container .host_checkbox').forEach(function(node, index, arr){
                    if(node.checked) {
                        hosts.push(that.hosts.enabled[domAttr.get(node, "data-index")]);
                    }
                });
            }
            
            if(type == this.type.ENABLE) {
                query('#history_disabled_hosts_container .host_checkbox').forEach(function(node, index, arr){
                    if(node.checked) {
                        hosts.push(that.hosts.disabled[domAttr.get(node, "data-index")]);
                    }
                });
            }
            
            if(hosts.length == 0) {
                net.apachegui.Util.alert("Error","Please select a host(s)");
                return;
            }
            
            var sendRequest = function() {
            
                var thisdialog = net.apachegui.Util.noCloseDialog('Updating', 'Updating Please Wait...');
                thisdialog.show();
                
                xhr.post({
                       url : "../web/History/update", 
                       postData : JSON.stringify({'option' : type.toLowerCase(), 'hosts' : hosts}),
                       headers : {
                            "Content-Type" : "application/json"
                       },
                       load: function(response,ioargs) {
                           that.refreshHosts();
                           thisdialog.remove();
                       },
                       error : function(response,ioargs) {
                           net.apachegui.Util.alert('Error',JSON.parse(response.response.data).message);
                           thisdialog.remove();
                       }
                    });
            };
            
            net.apachegui.Control.getInstance().isServerRunning(
                    function() {
                        net.apachegui.Util.confirmDialog(
                            "Please Confirm", 
                            "Are you sure you want to " + type.toLowerCase() + " history for these hosts?<br/>The server will be restarted to apply these changes!",
                            function confirm(conf) {
                                if(conf) {
                                    sendRequest();
                                }
                            }
                        );
                    }, 
                    function() {
                        sendRequest();
                    }
                );
        },
        
        search: function () {
            if(dom.byId('startDate').value == '' || dom.byId('startTime').value == '' || dom.byId('endDate').value == '' || dom.byId('endTime').value == '') {
                net.apachegui.Util.alert("Error","Please fill in all required fields");
            }
            else if(!registry.byId('startDate').isValid() || !registry.byId('startTime').isValid() || !registry.byId('endDate').isValid() || !registry.byId('endTime').isValid()) {
                net.apachegui.Util.alert("Error","Please fix required field formats");
            }
            else {

                var query = {
                    query: this.searchEditor.getValue()
                };

                var queryStr = ioQuery.objectToQuery(query);

                window.open('SearchResults.jsp?' + queryStr);
            }
        },
        
        csv: function () {
            if(dom.byId('startDate').value == '' || dom.byId('startTime').value == '' || dom.byId('endDate').value == '' || dom.byId('endTime').value == '') {
                net.apachegui.Util.alert("Error","Please fill in all required fields");
            }
            else if(!registry.byId('startDate').isValid() || !registry.byId('startTime').isValid() || !registry.byId('endDate').isValid() || !registry.byId('endTime').isValid()) {
                net.apachegui.Util.alert("Error","Please fix required field formats");
            }
            else
            {    
                var thisdialog = net.apachegui.Util.noCloseDialog('Generating', 'Please wait...');
                thisdialog.show();
                
                request.get("../web/SearchResults", {
                    query:     {
                        option: 'csv',
                        query: this.searchEditor.getValue()
                    },
                    handleAs: 'json',
                    sync: false,
                    preventCache: true
                }).response.then(
                    function(response) {
                        thisdialog.remove();
                        document.location='../HistoryFiles/ApacheGUIHistory.csv';    
                    },
                    function(error) {
                        thisdialog.remove();
                        net.apachegui.Util.alert('Error',error.response.data.message);
                    }
                );
                
            }
        },
        
        deleteHistory: function () {
            var that = this;

            net.apachegui.Util.confirmDialog(
                "Please Confirm", 
                "Are you sure you want to delete this History?",
                function confirm(conf){
                    if(conf) {
                        var thisdialog = net.apachegui.Util.noCloseDialog('Deleting ', 'Please wait...');
                        thisdialog.show();
                        
                        request.get("../web/SearchResults", {
                            query:     {
                                option: 'delete',
                                update: that.deleteEditor.getValue()
                            },
                            handleAs: 'json',
                            sync: false,
                            preventCache: true
                        }).response.then(
                            function(response) {
                                window.location.reload();
                            },
                            function(error) {
                                thisdialog.remove();
                                net.apachegui.Util.alert('Error',error.response.data.message);
                            }
                        );
                    }
                }
            );
        },
        
        graph: function () {
            if(dom.byId('graphDate').value == '') {
                net.apachegui.Util.alert("Error","Please fill in all required fields");
            }
            if(!registry.byId('graphDate').isValid()) {
                net.apachegui.Util.alert("Error","Please fix required field formats");
            }
            else {

                var query = {
                    query: this.graphEditor.getValue(),
                    date: dom.byId('graphDate').value,
                    type: registry.byId('graphType').value
                };

                var queryStr = ioQuery.objectToQuery(query);

                window.open('GenerateGraph.jsp?' + queryStr);
            }
        },
        
        getHistoryRetention: function () {
            var retentionDays=net.apachegui.Settings.getInstance().getSetting(net.apachegui.Settings.getInstance().settingsMap.historyRetention);
            return retentionDays;
        },
        
        updateHistoryRetention: function () {
            var change=net.apachegui.Settings.getInstance().setSetting(net.apachegui.Settings.getInstance().settingsMap.historyRetention,dom.byId('historyRetention').value);
            
            if(change===true) {
                net.apachegui.Util.alert('Success',"The days to keep history was successfully updated");
            }
        },
        
        getHistoryBuffer: function () {
            var historyBuffer=net.apachegui.Settings.getInstance().getSetting(net.apachegui.Settings.getInstance().settingsMap.historyBuffer);
            return historyBuffer;
        },
        
        updateHistoryBuffer: function () {
            var change=net.apachegui.Settings.getInstance().setSetting(net.apachegui.Settings.getInstance().settingsMap.historyBuffer,dom.byId('historyBuffer').value);
            
            if(change===true) {
                net.apachegui.Util.alert('Success',"The insert buffer size was successfully updated");
            }
        },
        
        addListeners: function() {
            var that = this;
            
            on(registry.byId('historySearchButton'), "click", function() {
                that.search();
            });
            
            on(registry.byId('historyCSVButton'), "click", function() {
                that.csv();
            });
    
            on(registry.byId('historyDeleteButton'), "click", function() {
                that.deleteHistory();
            });

            on(registry.byId('historyGraphButton'), "click", function() {
                that.graph();
            });
            
            on(registry.byId('historyRetentionButton'), "click", function() {
                that.updateHistoryRetention();
            });
            
            on(registry.byId('historyBufferButton'), "click", function() {
                that.updateHistoryBuffer();
            });
            
            on(registry.byId('saveEnableButton'), "click", function() {
                that.updateNonGlobal(that.type.ENABLE);
            });
            
            on(registry.byId('saveDisableButton'), "click", function() {
                that.updateNonGlobal(that.type.DISABLE);
            });

            registry.byId('search_database_query').watch("open", function(param, oldValue, newValue) {
                if(newValue) {
                    that.searchEditor.setValue(that.searchEditor.getValue());
                }
            });

            registry.byId('delete_database_update').watch("open", function(param, oldValue, newValue) {
                if(newValue) {
                    that.deleteEditor.setValue(that.deleteEditor.getValue());
                }
            });

            registry.byId('graph_database_query').watch("open", function(param, oldValue, newValue) {
                if(newValue) {
                    that.graphEditor.setValue(that.graphEditor.getValue());
                }
            });

            /*Listen to search form changes*/
            on(dijit.byId('startDate'), 'change', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });
            on(dijit.byId('startTime'), 'change', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });
            on(dijit.byId('endDate'), 'change', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });
            on(dijit.byId('endTime'), 'change', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });

            on(dom.byId('host'), 'change,keyup', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });

            on(dom.byId('userAgent'), 'change,keyup', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });

            on(dom.byId('requestString'), 'change,keyup', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });

            on(dom.byId('status'), 'change,keyup', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });

            on(dom.byId('contentSize'), 'change,keyup', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });

            on(dom.byId('maxResults'), 'change,keyup', function() {
                that.updateSearchQuery();
                that.updateDeleteUpdate();
            });

            /*Listen to graph form changes*/
            on(dijit.byId('graphDate'), 'change', function() {
                that.updateGraphQuery();
            });

            on(dijit.byId('graphType'), 'change', function() {
                that.updateGraphQuery();
            });

            on(dom.byId('graphHost'), 'change,keyup', function() {
                that.updateGraphQuery();
            });

            on(dom.byId('graphUserAgent'), 'change,keyup', function() {
                that.updateGraphQuery();
            });

            on(dom.byId('graphRequestString'), 'change,keyup', function() {
                that.updateGraphQuery();
            });

            on(dom.byId('graphStatus'), 'change,keyup', function() {
                that.updateGraphQuery();
            });

            on(dom.byId('graphContentSize'), 'change,keyup', function() {
                that.updateGraphQuery();
            });

        }
    });
   
    net.apachegui.Util.setupSingletonInstance(net.apachegui.History);
    
});