(function($) {
    var WeekCalendar = function(element, options) {
        this.options = options;
        this.$element = $(element);
        this.$itemGroups = [];
    };

    WeekCalendar.prototype = {
        constructor: WeekCalendar,
        init: function() {
            var that = this, element = this.$element;
            element.append(table(that));

            $(".weekCalendar-slot").tooltip();

            element.selectable({
                start: function() {
                },
                stop: function() {
                    var itemGroup = newItemGroup();
                    $(".ui-selected", this).each(function(index, e) {
                        itemGroup.elements.push($(e));
                    });
                    that.addItemGroup(itemGroup);
                },
                cancel: ".weekCalendar-hourColumn,th,.deleteBtn",
                filter: '.weekCalendar-slot'
            });
        },
        'serialize': function() {
            var res = this.$itemGroups;
            for (var x in this.$itemGroups) {
                this.$itemGroups[x].cleanItems = [];
                var startHour = undefined, endHour = undefined, 
                        startMinute = undefined, endMinute = undefined, 
                        startWeekDay = undefined, endWeekDay = undefined;
                
                for (var y in this.$itemGroups[x].elements) {
                    var e = this.$itemGroups[x].elements[y];
                    this.$itemGroups[x].cleanItems.push({
                        day: e.data("weekCalendar-weekDay"),
                        startHour: e.data("weekCalendar-hour"),
                        startMinute: e.data("weekCalendar-slot") * (60 / this.options.divisions),
                        duration: (60 / this.options.divisions)
                    });
                    
                    if (startHour === undefined || startHour >= e.data("weekCalendar-hour")) {
                        startHour = e.data("weekCalendar-hour")
                        var m = slot2minutes(this, e.data("weekCalendar-slot"))
                        if (startMinute === undefined 
                                || startMinute > m.from) {
                            startMinute = m.from
                            if (startMinute === 60) {
                                startHour = startHour + 1
                                startMinute = 0
                            }
                        }
                    }
                    
                    if (endHour === undefined || endHour <= e.data("weekCalendar-hour")) {
                        endHour = e.data("weekCalendar-hour")
                        var m = slot2minutes(this, e.data("weekCalendar-slot"))
                        if (endMinute === undefined 
                                || endMinute < m.to) {
                            endMinute = m.to
                            if (endMinute === 60) {
                                endHour = endHour + 1
                                endMinute = 0
                            }
                        }
                    }
                    
                    if(startWeekDay === undefined || startWeekDay > e.data("weekCalendar-weekDay")) {
                        startWeekDay = e.data("weekCalendar-weekDay")
                    }
                    if(endWeekDay === undefined || startWeekDay  < e.data("weekCalendar-weekDay")) {
                        endWeekDay = e.data("weekCalendar-weekDay")
                    }
                }
                
                this.$itemGroups[x].startHour = startHour
                this.$itemGroups[x].endHour = endHour
                this.$itemGroups[x].startMinute = startMinute
                this.$itemGroups[x].endMinute= endMinute
                this.$itemGroups[x].startWeekDay = startWeekDay
                this.$itemGroups[x].endWeekDay= endWeekDay
            }

            return res;
        },
        'deleteItemGroup': function(id) {
            for (var x in this.$itemGroups) {
                if (this.$itemGroups[x].id === id) {
                    for (var y in this.$itemGroups[x].elements) {
                        var e = this.$itemGroups[x].elements[y];
                        if ($(e).data("weekCalendar-itemGroupId") === id) {
                            $(e).removeClass("weekCalendar-itemGroup");
                            $(e).addClass("weekCalendar-slot");
                            $(e).removeData("weekCalendar-itemGroupId");
                            $(e).tooltip("enable");
                            e.empty();
                        }
                    }
                    this.$itemGroups.splice(x, 1);
                    $('#weekCalendar-deleteBtn' + id).remove();
                    $('#weekCalendar-info' + id).remove();
                }
            }
            this.options.deleteCallback.call();
        },
        'clear': function(){
            while (this.$itemGroups.length > 0) {
                this.deleteItemGroup(this.$itemGroups[0].id);
            }
        },
        'addItemGroup': function(itemGroup) {
            var that = this;
            var overlap = false;

            itemGroup.id = idGenerator();

            for (var x in itemGroup.elements) {
                if ($(itemGroup.elements[x]).data("weekCalendar-itemGroupId")) {
                    overlap = true;
                }
            }

            if (!overlap) {
                var info = $("<a>", {
                    'class': 'label label-info',
                    href: 'javascript:void(0)',
                    id: 'weekCalendar-info' + itemGroup.id,
                    style: "position: absolute; margin-top: 14px"
                });
                var deleteBtn = $("<a>", {
                    'class': 'label label-default deleteBtn',
                    href: '#',
                    id: 'weekCalendar-deleteBtn' + itemGroup.id,
                    style: "position: absolute;"
                }).html(that.options.i18n.deleteLabel);

                deleteBtn.on("click", function() {
                    that.deleteItemGroup(itemGroup.id);
                    return false;
                });
                itemGroup.elements[0].before(deleteBtn);

                $.each(itemGroup.elements, function(index, e) {
                    $(e).data("weekCalendar-itemGroupId", itemGroup.id);
                    $(e).addClass("weekCalendar-itemGroup");
                    $(e).removeClass("ui-selected");
                    $(e).tooltip("disable");
                });

                itemGroup.displayName = calculateItemGroupDisplayName(that, itemGroup);
                itemGroup.elements[0].append(
                        info.html(that.options.i18n.editLabel + " " + itemGroup.displayName));

                that.$itemGroups.push(itemGroup);

                that.options.stopCallback.call(itemGroup);
            }
        },
        'addCustomTime': function(customTime) {
            var that = this;
            var selector = "";
            for (var x = customTime.fromWeekDay; x <= customTime.toWeekDay; x++) {
                for (var y = customTime.fromHour; y <= customTime.toHour; y++) {
                    var tmpSel = "";

                    if (y !== customTime.fromHour && y !== customTime.toHour) {
                        tmpSel = "div[data-weekCalendar-weekDay=" + x
                                + "][data-weekCalendar-hour=" + y + "],";
                    } else {
                        //first or last hour

                        if (customTime.fromHour === customTime.toHour) {
                            //first or last hour are the same
                            for (var z = minute2Slot(that, customTime.fromMinute); z < minute2Slot(that, customTime.toMinute); z++) {
                                var aux = "div[data-weekCalendar-weekDay=" + x
                                        + "][data-weekCalendar-hour=" + y + "]"
                                        + "[data-weekCalendar-slot=" + z
                                        + "],";
                                tmpSel = tmpSel + aux;
                            }
                        } else {
                            if (y === customTime.fromHour) {
                                for (var z = minute2Slot(that, customTime.fromMinute); z <= that.options.divisions; z++) {
                                    var aux = "div[data-weekCalendar-weekDay=" + x
                                            + "][data-weekCalendar-hour=" + y + "]"
                                            + "[data-weekCalendar-slot=" + z
                                            + "],";
                                    tmpSel = tmpSel + aux;
                                }
                            }

                            if (y === customTime.toHour) {
                                for (var z = 0; z <= minute2Slot(that, customTime.toMinute); z++) {
                                    var aux = "div[data-weekCalendar-weekDay=" + x
                                            + "][data-weekCalendar-hour=" + y + "]"
                                            + "[data-weekCalendar-slot=" + z
                                            + "],";
                                    tmpSel = tmpSel + aux;
                                }
                            }
                        }
                    }

                    selector = selector + tmpSel;
                }
            }
            var elements = $(selector.substring(0, selector.length - 1));
            var itemGroup = newItemGroup();
            elements.each(function(index, e) {
                itemGroup.elements.push($(e));
            });
            that.addItemGroup(itemGroup);
        }
    };

    function slot2minutes(that, s) {
        var minutesPerSlot = (60 / (that.options.divisions));
        return {
            from: s * minutesPerSlot,
            to: (s + 1) * minutesPerSlot
        }
    }

    function minute2Slot(that, m) {
        var minutesPerSlot = (60 / (that.options.divisions));
        for (var x = 0; x <= that.options.divisions; x++) {
            if ((m >= minutesPerSlot * x) && (m <= minutesPerSlot * (x + 1))) {
                return x;
            }
        }
        return -1;
    }

    function idGenerator() {
        return new Date().getMilliseconds();
    }

    function newItemGroup() {
        return {id: 'tmp', elements: [], displayName: ''};
    }

    function rectifyDayLocal(that, d) {
        var l = d - that.options.startWeekDay;
        if (l < 0) {
            l = 7 + l;
        }
        return l % 7;
    }

    function calculateItemGroupDisplayName(that, itemGroup) {
        var minWeekDay, maxWeekDay;

        for (var x in itemGroup.elements) {
            var d = rectifyDayLocal(that, itemGroup.elements[x].data("weekCalendar-weekDay"));
            if (minWeekDay === undefined || minWeekDay >= d) {
                minWeekDay = d;
            }
            if (maxWeekDay === undefined || maxWeekDay <= d) {
                maxWeekDay = d;
            }
        }

        var dayStr;
        if (minWeekDay === maxWeekDay) {
            dayStr = that.options.i18n['weekDay' + ((minWeekDay + that.options.startWeekDay) % 7)];
        } else {
            dayStr = that.options.i18n['weekDay' + ((minWeekDay + that.options.startWeekDay) % 7)]
                    + "-" + that.options.i18n['weekDay' + ((maxWeekDay + that.options.startWeekDay) % 7)];
        }

        var minHour = itemGroup.elements[0].data("weekCalendar-hour");
        var minSlot = itemGroup.elements[0].data("weekCalendar-slot");
        var maxHour = itemGroup.elements[itemGroup.elements.length - 1].data("weekCalendar-hour");
        var maxSlot = itemGroup.elements[itemGroup.elements.length - 1].data("weekCalendar-slot");

        var minHourStr, maxHourStr;
        var minMinuteStr, maxMinuteStr;

        minHourStr = minHour;
        if (minHourStr < 10) {
            minHourStr = "0" + minHour;
        }

        var minutesPerSlot = (60 / that.options.divisions);
        if ((maxSlot + 1) === (that.options.divisions)) {
            maxHour = maxHour + 1;
            maxSlot = 0;
            minutesPerSlot = 0;
        }

        maxHourStr = maxHour;
        if (maxHour < 10) {
            maxHourStr = "0" + maxHour;
        }

        minMinuteStr = (60 / that.options.divisions) * minSlot;
        if (minMinuteStr < 10) {
            minMinuteStr = "0" + minMinuteStr;
        }

        maxMinuteStr = ((60 / that.options.divisions) * maxSlot) + minutesPerSlot;
        if (maxMinuteStr < 10) {
            maxMinuteStr = "0" + maxMinuteStr;
        }

        var res = dayStr + " " + minHourStr + ":" + minMinuteStr
                + "-" + maxHourStr + ":" + maxMinuteStr;
        return res;
    }

    function table(that) {
        return $("<table>", {
            'class': 'table table-bordered table-striped table-responsive weekCalendarTable'
        }).append(thead(that)).append(tbody(that));
    }

    function thead(that) {
        var arr = [
            that.options.i18n.weekDay0,
            that.options.i18n.weekDay1,
            that.options.i18n.weekDay2,
            that.options.i18n.weekDay3,
            that.options.i18n.weekDay4,
            that.options.i18n.weekDay5,
            that.options.i18n.weekDay6
        ];
        for (var i = 0; i < that.options.startWeekDay; i++) {
            arr.push(arr[0]);
            arr.splice(0, 1);
        }

        var tr = $("<tr>");
        var thead = $("<thead>").append(tr);
        tr.append($("<th>", {'class': 'weekCalendar-hourColumn', style: 'width: 20px'}));
        for (var x in arr) {
            tr.append($("<th>", {'class': 'weekCalendar-weekColumn'}).html(arr[x]));
        }

        return thead;
    }

    function tbody(that) {
        var body = $("<tbody>");

        for (var x = 0; x < 24; x++) {
            var tr = $("<tr>");
            body.append(tr);

            tr.append($("<td>", {'class': 'weekCalendar-hourColumn'}).html(formatHour(x, 0)));

            for (var y = 0 + that.options.startWeekDay; y < (7 + that.options.startWeekDay); y++) {
                var hour = $("<td>");
                tr.append(hour);

                for (var z = 0; z < that.options.divisions; z++) {
                    var hourSlot = $("<div>", {
                        'class': 'weekCalendar-slot weekCalendar-' + y.toString() + x.toString() + z.toString(),
                        style: 'height: ' + (that.options.style.height / that.options.divisions) + 'px;',
                        title: formatHour(x, ((60 / that.options.divisions) * z)),
                        'data-weekCalendar-hour': x,
                        'data-weekCalendar-weekDay': y % 7,
                        'data-weekCalendar-slot': z
                    });
                    hourSlot.data("weekCalendar-weekDay", y % 7);
                    hourSlot.data("weekCalendar-hour", x);
                    hourSlot.data("weekCalendar-slot", z);
                    hourSlot.data("weekCalendar-cordinate", x.toString() + y.toString() + z.toString());
                    hourSlot.empty();

                    hour.append(hourSlot);
                }
            }
        }

        if (!that.options.style.padding) {
            $("<style>").prop("type", "text/css").html("td {\
padding: 0 0 0 0 !important;\
}").appendTo("head");
        }

        $("<style>").prop("type", "text/css").html(
                ".weekCalendarTable>tbody>tr>td {\
height: " + that.options.style.height + "px;\
line-height: " + that.options.style.height + "px;\
}\
.weekCalendar-slot {\
width: 100%; \
height: 100%; \
display: block; \
border-top: 1px dotted black \
}\
div.ui-selecting {\
background: " + that.options.style.selectingColor + "\
}\
.weekCalendar-itemGroup {\
background-color: " + that.options.style.selectedColor + ";\
}\
.weekCalendarTable .weekCalendar-weekColumn {\
width: " + that.options.style.columnWidth + ";\
}\
.weekCalendarTable .weekCalendar-hourColumn,.weekCalendarTable th {\
text-align: center\
}\
.weekCalendarTable .weekCalendar-hourColumn{\
width: 5px\
}\
").appendTo("head");
        return body;
    }

    function formatHour(h, m) {
        var res = h.toString();
        if (h < 10) {
            res = "0" + h;
        }
        res = res + ":";
        if (m < 10) {
            res = res + "0" + m;
        } else {
            res = res + m;
        }
        return res;
    }

    /*
     * WeekCalendar PLUGIN DEFINITION
     */
    $.fn.weekCalendar = function(options) {
        var option = arguments[0],
                args = arguments;

        var results = [];
        this.each(function() {
            var $this = $(this),
                    data = $this.data('weekCalendar'),
                    options = $.extend({}, $.fn.weekCalendar.defaults, $this.data(), typeof option === 'object' && option);

            options.i18n = $.extend({}, $.fn.weekCalendar.i18nDefaults, option.i18n);
            options.style = $.extend({}, $.fn.weekCalendar.styleDefaults, option.style);

            if (!data) {
                $this.data('weekCalendar', (data = new WeekCalendar(this, options)));
            }

            if (typeof option === 'string') {
                var res = data[option](args[1]);
                results.push(res);
            } else {
                data.init();
            }
        });
        return results;
    };

    $.fn.weekCalendar.defaults = {
        divisions: 2,
        stopCallback: function() {
        },
        deleteCallback: function() {
        },
        startWeekDay: 0
    };

    $.fn.weekCalendar.i18nDefaults = {
        weekDay0: "Sunday",
        weekDay1: "Monday",
        weekDay2: "Tuesday",
        weekDay3: "Wednesday",
        weekDay4: "Thursday",
        weekDay5: "Fryday",
        weekDay6: "Saturday",
        weekDay7: "Sunday",
        deleteLabel: "<i class='glyphicon glyphicon-trash'></i> Delete",
        editLabel: "<i class='glyphicon glyphicon-edit'></i>"
    };

    $.fn.weekCalendar.styleDefaults = {
        padding: false,
        selectingColor: "aqua",
        selectedColor: "orange",
        columnWidth: "13%",
        height: 15
    };

}(jQuery));
