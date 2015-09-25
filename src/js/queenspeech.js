import traceurRuntime from 'traceur-runtime'
import sessionBills from "../../data/2015-2016.json!json"
import _ from 'lodash'
import tmpl from '../templates/queenspeech.html!text'
import doT from 'olado/doT'
import config from '../json/queenspeech.json!json'
import iframeMessenger from 'guardian/iframe-messenger'
import bonzo from 'ded/bonzo'
import { BillInfo } from './billinfo'
import css from '../../build/queenspeech.css!text';

function calcBillProgress(bill) {
    var perc = 0;
    var stageScores = {
        '1st reading': 7,
        '2nd reading': 15,
        'Committee stage': 22,
        'Report stage': 29,
        '3rd reading': 38
    }
    var currentStage = bill.stages[bill.stages.length-1];
    if (currentStage.name === 'Royal Assent') perc = 100;
    else {
        var startingHouse = bill.stages[0].house;
        if (startingHouse !== currentStage.house) {
            console.log(bill.name, startingHouse, currentStage.house)
            perc += 50;
        }
        var lastScored = _.findLast(bill.stages, stage => stageScores[stage.name]);
        perc += (stageScores[lastScored.name] || 0);
    }
    return perc;
}

export class Queenspeech {
    constructor({el, onlyStarted = false}) {
        this.el = el;
        var renderTemplate = doT.template(tmpl);
        var billsByName = _(sessionBills).groupBy('name').mapValues(bills => bills[0]).value()
        var bills = config.bills
            .map(name => {
                var bill = billsByName[name];

                return {
                    id: bill ? bill.id : -1,
                    name: name,
                    perc: bill ? calcBillProgress(bill) : 0
                }
            })
            .sort((a,b) => b.perc - a.perc);

        if (onlyStarted) bills = bills.filter(bill => bill.id !== -1);

        el.innerHTML = renderTemplate({bills});
        this.initBillInfo(sessionBills);
    }

    initBillInfo(bills) {
      this.billInfo = new BillInfo({
          container: this.el.querySelector('.tooltip-container'),
          listenerEl: this.el,
          bills: bills
      })
      this.billInfo.on('show', () => bonzo(this.el.querySelector('.queenspeech')).addClass('queenspeech--fade'));
      this.billInfo.on('hide', () => bonzo(this.el.querySelector('.queenspeech')).removeClass('queenspeech--fade'));
    }

}

export function init() {
    // var dateString = /date=(\d{4}\-\d{2}\-\d{2})/.exec(window.location.search);
    var onlyStarted = !!/onlyStarted=true/.exec(window.location.search);

    var style = document.createElement('style');
    style.type = "text/css";
    style.innerHTML = css;
    document.querySelector('head').appendChild(style)

    // document.getElementById('on-date').innerHTML = 'on ' + strftime('%e %b %Y', cfg.date);
    new Queenspeech({
        el: document.getElementById('queenspeech-container'),
        onlyStarted: onlyStarted
    });
    if (self !== top) {
        iframeMessenger.resize();
        window.setTimeout(_ => iframeMessenger.resize(), 1000);
    }
}
