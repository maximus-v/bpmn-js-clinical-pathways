var inherits = require('inherits'),
    isObject = require('lodash/lang/isObject'),
    assign = require('lodash/object/assign'),
    forEach = require('lodash/collection/forEach'),
    every = require('lodash/collection/every'),
    includes = require('lodash/collection/includes'),
    some = require('lodash/collection/some');

var BaseRenderer = require('diagram-js/lib/draw/BaseRenderer'),
    TextUtil = require('diagram-js/lib/util/Text'),
    createLine = require('diagram-js/lib/util/RenderUtil').createLine;

var isAny = require('bpmn-js/lib/features/modeling/util/ModelingUtil').isAny,
    is = require('bpmn-js/lib/util/ModelUtil').is;

var Icons = require('../icons/index');

var svgAppend = require('tiny-svg/lib/append'),
    svgAttr = require('tiny-svg/lib/attr'),
    svgCreate = require('tiny-svg/lib/create'),
    svgClasses = require('tiny-svg/lib/classes');

var LABEL_STYLE = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 12
};
var TASK_BORDER_RADIUS = 10;

function CPRenderer(eventBus, styles, pathMap) {
    BaseRenderer.call(this, eventBus, 1500);

    var textUtil = new TextUtil({
        style: LABEL_STYLE,
        size: {width: 100}
    });

    var computeStyle = styles.computeStyle;

    // add rendering of new elements here
    var handlers = this.handlers = {
        'cp:Task': function (parentGfx, element, attrs) {
            attrs = assign(attrs || {}, {
                fill: "#e1ebf7",
                stroke: "#376092"
            });

            var rect = drawRect(parentGfx, element.width, element.height, TASK_BORDER_RADIUS, attrs);
            renderEmbeddedLabel(parentGfx, element, 'center-middle');
            attachTaskMarkers(parentGfx, element);
            return rect;
        },
        'label': function (parentGfx, element) {
            // Update external label size and bounds during rendering when
            // we have the actual rendered bounds anyway.

            var textElement = renderExternalLabel(parentGfx, element);

            var textBBox;

            try {
                textBBox = textElement.getBBox();
            } catch (e) {
                textBBox = {width: 0, height: 0, x: 0};
            }

            // update element.x so that the layouted text is still
            // center alligned (newX = oldMidX - newWidth / 2)
            element.x = Math.ceil(element.x + element.width / 2) - Math.ceil((textBBox.width / 2));

            // take element width, height from actual bounds
            element.width = Math.ceil(textBBox.width);
            element.height = Math.ceil(textBBox.height);

            // compensate bounding box x
            svgAttr(textElement, {
                transform: 'translate(' + (-1 * textBBox.x) + ',0)'
            });

            return textElement;
        },
        'cp:TherapyTask': function (parent, element) {
            var task = renderer('cp:Task')(parent, element);
            var url = Icons.iconTherapyTask;

            var shapeGfx = svgCreate('image', {
                x: 3,
                y: 3,
                width: 20,
                href: url
            });

            svgAppend(parent, shapeGfx);

            return task;
        },
        'cp:DiagnosisTask': function (parent, element) {
            var task = renderer('cp:Task')(parent, element);
            var url = Icons.iconDiagnosisTask;

            var shapeGfx = svgCreate('image', {
                x: 3,
                y: 3,
                width: 15,
                href: url
            });

            svgAppend(parent, shapeGfx);

            return task;
        },
        'cp:SupportingTask': function (parent, element) {
            var task = renderer('cp:Task')(parent, element);
            var url = Icons.iconSupportingTask;

            var shapeGfx = svgCreate('image', {
                x: 3,
                y: 3,
                width: 20,
                href: url
            });

            svgAppend(parent, shapeGfx);

            return task;
        },
        'cp:EducationTask': function (parent, element) {
            var task = renderer('cp:Task')(parent, element);

            createMaterialIcon('school', parent, {
                x: 2,
                y: 25
            });

            return task;
        },
        'cp:HomeVisitTask': function (parent, element) {
            var task = renderer('cp:Task')(parent, element);

            createMaterialIcon('home', parent, {
                x: 2,
                y: 25
            });

            return task;
        },
        'cp:MonitoringTask': function (parent, element) {
            var task = renderer('cp:Task')(parent, element);

            createMaterialIcon('computer', parent, {
                x: 2,
                y: 25
            });

            return task;
        },
        'cp:PhoneContactTask': function (parent, element) {
            var task = renderer('cp:Task')(parent, element);

            createMaterialIcon('contact_phone', parent, {
                x: 2,
                y: 25
            });

            return task;
        },
        /** TASKS END **/

        /** RESOURCES START */
        'cp:CPResource': function (parent, element) {
            var rect = drawRect(parent, element.width, element.height, 0, {stroke: "green", fill: "#d1e8c4"});
            renderEmbeddedLabel(parent, element, 'center-middle');
            return rect;
        },
        'cp:HumanResource': function (parent, element) {
            var resource = renderer('cp:CPResource')(parent, element);

            createFontawesomeIcon('\uf007', parent);

            return resource;
        },
        'cp:ConsumptionResource': function (parent, element) {
            var resource = renderer('cp:CPResource')(parent, element);

            createFontawesomeIcon('\uf0fa', parent);

            return resource;
        },
        'cp:Equipment': function (parent, element) {
            var resource = renderer('cp:CPResource')(parent, element);

            createFontawesomeIcon('\uf0c3', parent);

            return resource;
        },
        'cp:Medicine': function (parent, element) {
            var resource = renderer('cp:CPResource')(parent, element);

            createMedicalIcon('pharmacy', parent);

            return resource;
        },
        'cp:TransportationEquipment': function (parent, element) {
            var resource = renderer('cp:CPResource')(parent, element);

            createFontawesomeIcon('\uf0f9', parent);

            return resource;
        },
        'cp:Room': function (parent, element) {
            var resource = renderer('cp:CPResource')(parent, element);

            createFontawesomeIcon('\uf0f8', parent);

            return resource;
        },
        'cp:Auxiliaries': function (parent, element) {
            var resource = renderer('cp:CPResource')(parent, element);

            createFontawesomeIcon('\uf1cd', parent);

            return resource;
        },
        /** RESOURCES END */

        /** CUSTOM CONNECTIONS / RELATIONS START **/
        'cp:ResourceRelation': function (parent, element) {

            var attrs = computeStyle(attrs, {
                stroke: '#008000',
                strokeWidth: 2,
                strokeDasharray: "3, 3"
            });

            var gfx = svgAppend(parent, createLine(element.waypoints, attrs));
            renderExternalLabel(parent, element);

            return gfx;
        },
        'cp:StatementRelation': function (parent, element) {
            var attrs = computeStyle(attrs, {
                stroke: '#4aa8cc',
                strokeWidth: 2
            });

            return svgAppend(parent, createLine(element.waypoints, attrs));
        },
        /** CUSTOM CONNECTIONS / RELATIONS END **/

        'cp:Document': function (parent, element) {
            element.width = 40;
            element.height = 50;

            var pathData = pathMap.getScaledPath('DATA_OBJECT_PATH', {
                xScaleFactor: 1,
                yScaleFactor: 1,
                containerWidth: element.width,
                containerHeight: element.height,
                position: {
                    mx: 0.474,
                    my: 0.296
                }
            });


            var elementObject = drawPath(parent, pathData, {fill: 'white'});

            var semantic = getSemantic(element);

            if (isCollection(semantic)) {
                renderDataItemCollection(parent, element);
            }


            var url = Icons.iconDocument;

            var iconGfx = svgCreate('image', {
                x: 3,
                y: element.height - 28,
                height: 25,
                href: url
            });

            svgAppend(parent, iconGfx);

            return elementObject;
        },
        'cp:SimultanParallelGateway': function (parent, element) {
            var url = Icons.iconSimultanParallelGateway;

            element.width = 50;
            element.height = 50;

            var shapeGfx = svgCreate('image', {
                x: 0,
                y: 0,
                width: element.width,
                height: element.height,
                href: url
            });

            svgAppend(parent, shapeGfx);

            return shapeGfx;
        },
        'cp:EvidenceGateway': function (parent, element) {
            var url = Icons.iconEvidenceGateway;

            element.width = 50;
            element.height = 50;

            var shapeGfx = svgCreate('image', {
                x: 0,
                y: 0,
                width: element.width,
                height: element.height,
                href: url
            });

            svgAppend(parent, shapeGfx);

            // draw evidence marker


            return shapeGfx;
        },

        /**
         * MARKER CP
         *
         */
        'cp:EvidenceMarker': function (parentGfx, element) {
            var url = Icons.iconEvidenceMarker;

            element.width = 50;

            var shapeGfx = svgCreate('image', {
                x: 0,
                y: 0,
                width: element.width,
                href: url
            });

            svgAppend(parentGfx, shapeGfx);

            return shapeGfx;
        },
        /**
         * MARKER BASE
         */
        'ParticipantMultiplicityMarker': function (parentGfx, element) {
            var markerPath = pathMap.getScaledPath('MARKER_PARALLEL', {
                xScaleFactor: 1,
                yScaleFactor: 1,
                containerWidth: element.width,
                containerHeight: element.height,
                position: {
                    mx: ((element.width / 2) / element.width),
                    my: (element.height - 15) / element.height
                }
            });

            drawMarker('participant-multiplicity', parentGfx, markerPath);
        },
        'SubProcessMarker': function (parentGfx, element) {
            var markerRect = drawRect(parentGfx, 14, 14, 0, {
                strokeWidth: 1
            });

            // Process marker is placed in the middle of the box
            // therefore fixed values can be used here
            translate(markerRect, element.width / 2 - 7.5, element.height - 20);

            var markerPath = pathMap.getScaledPath('MARKER_SUB_PROCESS', {
                xScaleFactor: 1.5,
                yScaleFactor: 1.5,
                containerWidth: element.width,
                containerHeight: element.height,
                position: {
                    mx: (element.width / 2 - 7.5) / element.width,
                    my: (element.height - 20) / element.height
                }
            });

            drawMarker('sub-process', parentGfx, markerPath);
        },
        'ParallelMarker': function (parentGfx, element, position) {
            var markerPath = pathMap.getScaledPath('MARKER_PARALLEL', {
                xScaleFactor: 1,
                yScaleFactor: 1,
                containerWidth: element.width,
                containerHeight: element.height,
                position: {
                    mx: ((element.width / 2 + position.parallel) / element.width),
                    my: (element.height - 20) / element.height
                }
            });

            drawMarker('parallel', parentGfx, markerPath);
        },
        'SequentialMarker': function (parentGfx, element, position) {
            var markerPath = pathMap.getScaledPath('MARKER_SEQUENTIAL', {
                xScaleFactor: 1,
                yScaleFactor: 1,
                containerWidth: element.width,
                containerHeight: element.height,
                position: {
                    mx: ((element.width / 2 + position.seq) / element.width),
                    my: (element.height - 19) / element.height
                }
            });

            drawMarker('sequential', parentGfx, markerPath);
        },
        'CompensationMarker': function (parentGfx, element, position) {
            var markerMath = pathMap.getScaledPath('MARKER_COMPENSATION', {
                xScaleFactor: 1,
                yScaleFactor: 1,
                containerWidth: element.width,
                containerHeight: element.height,
                position: {
                    mx: ((element.width / 2 + position.compensation) / element.width),
                    my: (element.height - 13) / element.height
                }
            });

            drawMarker('compensation', parentGfx, markerMath, {strokeWidth: 1});
        },
        'LoopMarker': function (parentGfx, element, position) {
            var markerPath = pathMap.getScaledPath('MARKER_LOOP', {
                xScaleFactor: 1,
                yScaleFactor: 1,
                containerWidth: element.width,
                containerHeight: element.height,
                position: {
                    mx: ((element.width / 2 + position.loop) / element.width),
                    my: (element.height - 7) / element.height
                }
            });

            drawMarker('loop', parentGfx, markerPath, {
                strokeWidth: 1,
                fill: 'none',
                strokeLinecap: 'round',
                strokeMiterlimit: 0.5
            });
        },
        'AdhocMarker': function (parentGfx, element, position) {
            var markerPath = pathMap.getScaledPath('MARKER_ADHOC', {
                xScaleFactor: 1,
                yScaleFactor: 1,
                containerWidth: element.width,
                containerHeight: element.height,
                position: {
                    mx: ((element.width / 2 + position.adhoc) / element.width),
                    my: (element.height - 15) / element.height
                }
            });

            drawMarker('adhoc', parentGfx, markerPath, {
                strokeWidth: 1,
                fill: 'black'
            });
        }
    };

    function createMaterialIcon(icon, parent, options) {
        options = options || {};

        var attr = assign(options, {
            class: 'material-icons'
        });

        var text = svgCreate('text', attr);
        text.textContent = icon;

        svgAppend(parent, text);

        return text;
    }

    function createFontawesomeIcon(icon, parent, options) {
        options = options || {};

        var attr = assign({
            x: 2,
            y: 22,
            class: 'fa fa-2x'
        }, options);

        var text = svgCreate('text', attr);
        text.textContent = icon;

        svgAppend(parent, text);

        return text;
    }

    function createMedicalIcon(icon, parent, options) {
        options = options || {};

        var shapeGfx = svgCreate('image', assign({
            x: -2,
            y: 2,
            width: 25,
            href: 'clinical-pathways/icons/webfont-medical-icons/i-' + icon + '.png'
        }, options));


        svgAppend(parent, shapeGfx);

        return shapeGfx;
    }

    function renderer(type) {
        return handlers[type];
    }

    function drawPath(parentGfx, d, attrs) {

        attrs = computeStyle(attrs, ['no-fill'], {
            strokeWidth: 2,
            stroke: 'black'
        });

        var path = svgCreate('path');
        svgAttr(path, {d: d});
        svgAttr(path, attrs);

        svgAppend(parentGfx, path);

        return path;
    }

    function renderDataItemCollection(parentGfx, element) {

        var yPosition = (element.height - 16) / element.height;

        var pathData = pathMap.getScaledPath('DATA_OBJECT_COLLECTION_PATH', {
            xScaleFactor: 1,
            yScaleFactor: 1,
            containerWidth: element.width,
            containerHeight: element.height,
            position: {
                mx: 0.451,
                my: yPosition
            }
        });

        /* collection path */
        drawPath(parentGfx, pathData, {
            strokeWidth: 2
        });
    }

    function drawRect(parentGfx, width, height, r, offset, attrs) {

        if (isObject(offset)) {
            attrs = offset;
            offset = 0;
        }

        offset = offset || 0;

        console.log(attrs);

        attrs = computeStyle(attrs, {
            stroke: 'black',
            strokeWidth: 2,
            fill: 'white'
        });

        var rect = svgCreate('rect');
        svgAttr(rect, {
            x: offset,
            y: offset,
            width: width - offset * 2,
            height: height - offset * 2,
            rx: r,
            ry: r
        });
        svgAttr(rect, attrs);

        svgAppend(parentGfx, rect);

        return rect;
    }

    function drawMarker(type, parentGfx, path, attrs) {
        return drawPath(parentGfx, path, assign({'data-marker': type}, attrs));
    }

    function attachTaskMarkers(parentGfx, element, taskMarkers) {
        var obj = getSemantic(element);

        var subprocess = includes(taskMarkers, 'SubProcessMarker');
        var position;

        if (subprocess) {
            position = {
                seq: -21,
                parallel: -22,
                compensation: -42,
                loop: -18,
                adhoc: 10
            };
        } else {
            position = {
                seq: -3,
                parallel: -6,
                compensation: -27,
                loop: 0,
                adhoc: 10
            };
        }

        forEach(taskMarkers, function (marker) {
            renderer(marker)(parentGfx, element, position);
        });

        if (obj.isForCompensation) {
            renderer('CompensationMarker')(parentGfx, element, position);
        }

        if (obj.$type === 'bpmn:AdHocSubProcess') {
            renderer('AdhocMarker')(parentGfx, element, position);
        }

        var loopCharacteristics = obj.loopCharacteristics,
            isSequential = loopCharacteristics && loopCharacteristics.isSequential;

        if (loopCharacteristics) {

            if (isSequential === undefined) {
                renderer('LoopMarker')(parentGfx, element, position);
            }

            if (isSequential === false) {
                renderer('ParallelMarker')(parentGfx, element, position);
            }

            if (isSequential === true) {
                renderer('SequentialMarker')(parentGfx, element, position);
            }
        }
    }

    function renderLabel(parentGfx, label, options) {
        var text = textUtil.createText(parentGfx, label || '', options);
        svgClasses(text).add('djs-label');

        return text;
    }

    function renderEmbeddedLabel(parentGfx, element, align) {
        var semantic = getSemantic(element);
        return renderLabel(parentGfx, semantic.name, {box: element, align: align, padding: 5});
    }

    function renderExternalLabel(parentGfx, element) {
        var semantic = getSemantic(element);
        var box = {
            width: 90,
            height: 30,
            x: element.width / 2 + element.x,
            y: element.height / 2 + element.y
        };

        return renderLabel(parentGfx, semantic.name, {box: box, style: {fontSize: '11px'}});
    }

    this.canRender = function (element) {
        return this.handlers[element.type] != undefined;
        return isAny(element, [
            'cp:TherapyTask',
            'cp:DiagnosisTask',
            'cp:SupportingTask',
            'cp:EducationTask',
            'cp:HomeVisitTask',
            'cp:MonitoringTask',
            'cp:PhoneContactTask',
            'cp:Document',
            'cp:SimultanParallelGateway',
            'cp:EvidenceGateway',
            'cp:EvidenceMarker',
            'cp:HumanResource',
            'cp:ConsumptionResource',
            'cp:TransportationEquipment'
        ]);
    };

    this.drawShape = function (parent, element) {

        var handler = this.handlers[element.type];

        if (handler instanceof Function) {
            return handler(parent, element);
        }

        return false;
    };

    this.drawConnection = function (parent, element) {
        if (isAny(element, ['cp:ResourceRelation', 'cp:StatementRelation'])) {
            return this.drawShape(parent, element);
        }
    };
}

/**
 * CONNECTIONs
 * @param element
 * @returns {*|Boolean}
 *
 CPRenderer.prototype.drawConnection = function(p, element) {

    var type = element.type;

    if (type === 'cp:connection') {
        return this.drawCustomConnection(p, element);
    }
};


 CPRenderer.prototype.getConnectionPath = function(connection) {

    var type = connection.type;

    if (type === 'cp:connection') {
        return this.getCustomConnectionPath(connection);
    }
};
 */

CPRenderer.$inject = ['eventBus', 'styles', 'pathMap'];
inherits(CPRenderer, BaseRenderer);

module.exports = CPRenderer;

function getSemantic(element) {
    return element.businessObject;
}

function isCollection(element) {
    return element.isCollection ||
        (element.elementObjectRef && element.elementObjectRef.isCollection);
}