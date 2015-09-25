import doT from 'olado/doT'
import template from '../templates/billinfo.html!text'
import strftime from 'samsonjs/strftime'

var renderTemplate = doT.template(template);

export function billHTML(bill) {
	function find(arr, fn) {
		for (var i = 0; i < arr.length; i++) {
			if (fn(arr[i])) return arr[i];
		}
	}
    var stagesByDate = {};
    bill.stages.forEach(stage => {
        stagesByDate[stage.date] = stagesByDate[stage.date] || [];
        stagesByDate[stage.date].push(stage);
    });

    var dates = Object.keys(stagesByDate).sort((a,b) =>
        !a ? 100 : !b ? -100 : a > b ? 1 : -1 // sort TBA (no date) to bottom
    );

    var niceDate = date => date ? strftime('%e %B %Y', new Date(date)) : 'TBA'
    var royalAssent = find(bill.stages,stage => stage.name === "Royal Assent")
    var finalDate = royalAssent ? royalAssent.date : undefined;

    return renderTemplate({bill, dates, stagesByDate, niceDate, finalDate});
}
