import traceurRuntime from 'traceur-runtime'
import sessionBills from "../../data/2015-2016.json!json"
import doT from 'olado/doT'
import stateTemplate from '../templates/state.html!text'
import bean from 'fat/bean'
import bonzo from 'ded/bonzo'
import _ from 'lodash'
import strftime from 'samsonjs/strftime'
import config from '../json/config.json!json'
import iframeMessenger from 'guardian/iframe-messenger'
import { BillInfo } from './billinfo'

var renderStateTemplate = doT.template(stateTemplate);
var now = new Date();

export class State {
    constructor({el, bills = sessionBills, types = ['Government', 'Hybrid'], date = now}) {
        this.bills = bills
        this.date = date;
        this.el = el;
        this.preprocessBills(this.bills);
        this.renderBills(this.bills);
        this.showTypes(types);
        this.initBillInfo(this.bills);
    }

    initBillInfo(bills) {
      this.billInfo = new BillInfo({
          container: this.el.querySelector('.tooltip-container'),
          listenerEl: this.el,
          bills: bills
      })
      this.billInfo.on('show', () => bonzo(this.el.querySelector('.state')).addClass('state--fade'));
      this.billInfo.on('hide', () => bonzo(this.el.querySelector('.state')).removeClass('state--fade'));
    }

    preprocessBills(bills) {
        var stageValues = config.stages.map(stage => stage.value);
        bills.forEach(bill => {
            var finishedStages = bill.stages.filter(stage => stage.date && Date.parse(stage.date) < this.date)
            if (finishedStages.length) {
                finishedStages[finishedStages.length - 1].current = true;
                var currentMajorStage = _.findLast(finishedStages, stage =>
                    stageValues.indexOf(stage.name) !== -1 || stage.name === 'Royal Assent')
                if (currentMajorStage) currentMajorStage.currentMajor = true;
            }

        })
    }

    renderBills(bills) {
        var typeOrder = _.zipObject( config.types.map((typeObj, index) => [typeObj.name, index] ) )
        var billsByStage = _(bills)
            .uniq(bill => bill.name)
            .sort((a,b) => typeOrder[a.type] - typeOrder[b.type])
            .groupBy(bill => bill.stages[0].house)
            .mapValues(bills =>
                _.groupBy(bills, bill => {
                    var currentStage = _.findLast(bill.stages, stage => stage.currentMajor)
                    if (currentStage) {
                        var house = currentStage.house ? currentStage.house + ' ' : '';
                        return `${house}${currentStage.name}`;
                    }
                })
            ).value();
        this.el.innerHTML = renderStateTemplate({bills: billsByStage, stages: config.stages});
    }

    hideAllBills() {
        bonzo(this.el.querySelectorAll('.bill')).removeClass('bill--visible')
    }
    showType(type) {
        bonzo(this.el.querySelectorAll(`.bill[billtype="${type}"]`)).addClass('bill--visible')
    }
    showTypes(types) {
        this.hideAllBills();
        types.forEach(this.showType.bind(this));
    }
}

export function init(el, context) {
    var dateString = /date=(\d{4}\-\d{2}\-\d{2})/.exec(window.location.search);
    var cfg = {
        el: document.getElementById('state-container'),
        types: ['Government', 'Hybrid'],
        date: dateString ? new Date(dateString[1]) : new Date()
    }
    document.getElementById('on-date').innerHTML = 'on ' + strftime('%e %b %Y', cfg.date);
    var state = new State(cfg);
    if (self !== top) iframeMessenger.resize();
}
