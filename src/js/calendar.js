// import allBills from "../../nice.json!json"
import doT from 'olado/doT'
import template from '../templates/calendar.html!text'
import strftime from 'samsonjs/strftime'
import bills from '../../data/2015-2016.json!json'

var renderTemplate = doT.template(template);

function nextDay(date) {
	var ret = new Date(date);
	ret.setDate(date.getDate() + 1);
	return ret;
}

export class Calendar {
	constructor(el, fromDate, toDate) {
		var calendar = {};
		var current = new Date(fromDate);
		while (current <= toDate) {
			let currentFormatted = current.toISOString().slice(0,10);
			bills.forEach(bill => {
				var stages = bill.stages.filter(stage => currentFormatted === stage.date)
				if (stages.length) {
					calendar[currentFormatted] = calendar[currentFormatted] || [];
					var house = bill.stages[0].house ? bill.stages[0].house.split(' ').reverse()[0] : '';
					calendar[currentFormatted].push({bill, stages, house});
				}
			})
			current = nextDay(current);
		}
		var dates = Object.keys(calendar).sort();
		var niceDate = date => date ? strftime('%e %B %Y', new Date(date)) : 'TBA'
		el.innerHTML = renderTemplate({dates, calendar, niceDate})
	}
}
