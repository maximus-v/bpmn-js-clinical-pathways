'use strict';

// @TODO 1 progress bar erstellen
// @TODO 2 eye candy
// @TODO 3 GET
// @TODO 4 clean up code

var fs = require('fs');

var $ = require('jquery'),
    BpmnModeler = require('bpmn-js/lib/Modeler');

var container = $('#js-drop-zone');

var canvas = $('#js-canvas');

var swal = require('sweetalert');

// helper
var forEach = require('lodash/collection/forEach');
var isAny = require('bpmn-js/lib/features/modeling/util/ModelingUtil').isAny;

// elfinder
var ElFinderHelper = require('./elfinder/ElFinderHelper');
var elFinderHelper = new ElFinderHelper(modeler, openDiagram);

// property panel
var propertiesPanelModule = require('bpmn-js-properties-panel');

// CLI Module
// @TODO implement window.cli.undo() and window.cli.redo() -> Buttons
var CliModule = require('bpmn-js-cli');

// CP properties
var CPpropertiesProviderModule = require('./clinical-pathways/properties-provider');

// CP DEPENDENCIES
var cpPaletteModule = require('./clinical-pathways/palette');
var cpDrawModule = require('./clinical-pathways/draw');

// CP Metamodel
var cpMetamodel = require('./clinical-pathways/ext-metamodel/CPMetamodel.json');

// CP Rules
var cpRules = require('./clinical-pathways/rules');

// CP POPMENU
var cpPopupMenu = require('./clinical-pathways/popup-menu');

// CP ContextPad
var cpContextPad = require('./clinical-pathways/context-pad');

// CP Auto-Resize
var cpAutoResize = require('./clinical-pathways/auto-resize');

// CP Label
var cpBehavior = require('./clinical-pathways/modeling/behavior');

// CP Importer
var cpImporter = require('./clinical-pathways/import');

var modeler = new BpmnModeler({
    container: canvas, keyboard: {bindTo: document},
    cli: {bindTo: 'cli'},
    propertiesPanel: {
        parent: '#js-properties-panel'
    },

    additionalModules: [
        cpImporter,
        cpBehavior,
        cpRules,
        cpContextPad,
        propertiesPanelModule,
        CliModule,
        CPpropertiesProviderModule,
        cpPaletteModule,
        cpDrawModule,

        cpPopupMenu,
        cpAutoResize

    ],
    moddleExtensions: {
        cp: cpMetamodel
    }
});

var latestXML, diagramName;
var newDiagramXML = fs.readFileSync(__dirname + '/../resources/newDiagram.bpmn', 'utf-8');

function createNewDiagram() {
    openDiagram(newDiagramXML);
}

function isCP(element) {
    return element && /cp\:/.test(element.type);
}

function openDiagram(xml) {

    modeler.importXML(xml, function (err) {

        if (err) {
            container
                .removeClass('with-diagram')
                .addClass('with-error');

            container.find('.error pre').text(err.message);

            console.error(err);
        } else {
            container
                .removeClass('with-error')
                .addClass('with-diagram');

            var eventBus = modeler.get('eventBus');

            var cpElements = modeler.get('elementRegistry').filter(function (element) {
                if (isCP(element)) {
                    return true;
                }
            });

            // @todo auslagern in module?
            // applys overlays to specific elements

            var alreadyProcessed = [];
            modeler.get('elementRegistry').filter(function (element) {

                eventBus.fire({type: 'element.changed'}, {element: element});
                if (alreadyProcessed.indexOf(element.businessObject.get('id')) == -1) {
                    alreadyProcessed.push(element.businessObject.get('id'));


                }
                return false;

            });


        }


    });
}

function saveSVG(done) {
    modeler.saveSVG(done);
}

function saveDiagram(done) {
    modeler.saveXML({format: true}, function (err, xml) {
        done(err, xml);
    });
}

function registerFileDrop(container, callback) {

    function handleFileSelect(e) {
        e.stopPropagation();
        e.preventDefault();

        var files = e.dataTransfer.files;

        var file = files[0];

        var reader = new FileReader();

        reader.onload = function (e) {

            var xml = e.target.result;

            diagramName = file.name;

            callback(xml);
        };

        reader.readAsText(file);
    }

    function handleDragOver(e) {
        e.stopPropagation();
        e.preventDefault();

        e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    container.get(0).addEventListener('dragover', handleDragOver, false);
    container.get(0).addEventListener('drop', handleFileSelect, false);
}


////// file drag / drop ///////////////////////

// check file api availability
if (!window.FileList || !window.FileReader) {
    window.alert(
        'Looks like you use an older browser that does not support drag and drop. ' +
        'Try using Chrome, Firefox or the Internet Explorer > 10.');
} else {
    registerFileDrop(container, openDiagram);
}

// bootstrap diagram functions

$(document).ready(function () {

    createNewDiagram()

    var downloadLink = $('#js-download-diagram');
    var downloadSvgLink = $('#js-download-svg');

    // NEW CONTROLS

    var postDiagram = $('#js-req-post');
    var getAllDiagrams = $('#js-req-get');

    $('.controls a').click(function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    // POST diagram
    postDiagram.click(function (e) {
        var url = "http://localhost:8080/belegarbeit/api/bpmn";

        var xhr = new XMLHttpRequest();

        xhr.addEventListener("progress", updateProgress);
        xhr.addEventListener("load", transferComplete);
        xhr.addEventListener("error", transferFailed);
        xhr.addEventListener("abort", transferCanceled);

        xhr.open("POST", url, true);

        if (!xhr) {
            alert("CORS not supported");
        }

        xhr.onreadystatechange = function() {
        };

        xhr.onload = function() {
        };

        xhr.onerror = function() {
        };

        xhr.send(latestXML);
    });

    // GET all diagrams
    getAllDiagrams.click(function (e) {
        // delete previous diagrams
        $('#path-list').empty();

        var url = "http://localhost:8080/belegarbeit/api/bpmn";

        var xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/xml");

        xhr.addEventListener("progress", updateProgress);
        xhr.addEventListener("load", transferComplete);
        xhr.addEventListener("error", transferFailed);
        xhr.addEventListener("abort", transferCanceled);

        xhr.open("GET", url, true);

        if (!xhr) {
            alert("CORS not supported");
        }

        xhr.onreadystatechange = function() {
        };

        xhr.onload = function() {
            var jsonResponse = JSON.parse(xhr.responseText);

            var i;
            for (i = 0; i < jsonResponse.length; i++) {
                var listID = jsonResponse[i]["id"];
                var listName = jsonResponse[i]["name"];
                $('#path-list').append("<li><span class='id'>"+listID+"</span> <span class='name'>"+listName+"</span>");
                $('.path-list-container').show();
            }
        };

        xhr.onerror = function() {
        };

        xhr.send();
    });

    // GET specific diagram
    $('#path-list').on("click", "li", function() {
        var id = $(this).find(".id").text();
        var url = "http://localhost:8080/belegarbeit/api/bpmn/" + id;

        var xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/xml");

        xhr.addEventListener("progress", updateProgress);
        xhr.addEventListener("load", transferComplete);
        xhr.addEventListener("error", transferFailed);
        xhr.addEventListener("abort", transferCanceled);

        xhr.open("GET", url, true);

        if (!xhr) {
            alert("CORS not supported");
        }

        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                $('.path-list-container').hide();
                openDiagram(xhr.responseText);
            }
        };

        xhr.onload = function() {
        };

        xhr.onerror = function() {
        };

        xhr.send();
    });

    // END NEW

    function setEncoded(link, name, data) {
        var encodedData = encodeURIComponent(data);

        latestXML = data;

        if (data) {
            link.addClass('active').attr({
                'href': 'data:application/bpmn20-xml;charset=UTF-8,' + encodedData,
                'download': name
            });
        } else {
            link.removeClass('active');
        }
    }

    var _ = require('lodash');

    var exportArtifacts = _.debounce(function () {

        saveSVG(function (err, svg) {
            setEncoded(downloadSvgLink, 'diagram.svg', err ? null : svg);
        });

        saveDiagram(function (err, xml) {
            setEncoded(downloadLink, 'diagram.bpmn', err ? null : xml);
        });
    }, 500);

    modeler.on('commandStack.changed', exportArtifacts);
});

function saveDiagramToDisk(fileName, latestXML) {
    $.post('/diagram/save/' + encodeURI(fileName), {xml: latestXML}).done(function (json) {
        if (json.result) {
            swal({
                title: "BPMN model saved!",
                text: "Your BPMN model was saved.",
                type: "success",
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            swal({
                title: "BPMN not saved!",
                text: "Your BPMN model was NOT saved. Something is wrong. Please check your POST data via browsers console window!",
                type: "error",
                showConfirmButton: false
            });
        }
    }).fail(function () {
        swal({
            title: "BPMN not saved!",
            text: "Your BPMN model was NOT saved. Something is wrong. Please check your POST data via browsers console window!",
            type: "error",
            showConfirmButton: false
        });
    });
}

function isWebserver() {
    return window.location.href.indexOf("localhost:9013") === -1;
}

function updateProgress (oEvent) {
    if (oEvent.lengthComputable) {
        var percentComplete = oEvent.loaded / oEvent.total;
    } else {
        // Unable to compute progress information since the total size is unknown
    }
}

function transferComplete(evt) {
    alert("Transfer complete");
}

function transferFailed(evt) {
    alert("An error occurred while transferring the file.");
}

function transferCanceled(evt) {
    alert("The transfer has been canceled by the user.");
}