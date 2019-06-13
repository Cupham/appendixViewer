// elDdviewer.js
// 2019.06.11

var vm = new Vue({
    el: '#app',
    data: {
        rbView: 'standard',
        rbLanguage: 'japanese',
        appendix_list: [],  // v-for で使う
        packetDetail: '',
        deviceSelected: '0x0130',
        deviceList: [],
        releaseSelected: '',
        releaseList: [],
    },
    methods: {
        updateDevice: function () {
            console.log("deviceSelected: ", this.deviceSelected);
            refresh();
        },
        updateRelease: function () {
            console.log("updateRelease: ", this.releaseSelected);
            refresh();
        },
        updateView: function () {
            console.log("updateView, rbView:", this.rbView);
            refresh();
        },
        updateLanguage: function () {
            console.log("updateLanguage, rbLanguage:", this.rbLanguage);
            refresh();
        },
        showEdtDetailModal: function () {
            console.log("showEdtDetailModal");
        	let number = event.currentTarget.getAttribute('data-number');
            console.log("number= ", number);
        },
		// パケット一覧からパケット行がクリックされたときの処理 (パケット詳細を表示)
		showPacketDetail: this.packetMonitorShowPacketDetail.bind(this),
		// パケット一覧で矢印キーが押されたときの処理
		upDownList: this.packetMonitorUpDownList.bind(this)
    }
});

init();
refresh();

function init() {
    console.log("JSON data Date:", jsonData.metaData.date, "Relase:", jsonData.metaData.release, "Version:", jsonData.metaData.version);
    const latestRelease = jsonData.metaData.release;
    vm.releaseSelected = latestRelease;
}

function refresh() {
    const latestRelease = jsonData.metaData.release;
    const selectedEoj = vm.deviceSelected;
    let selectedRelease = vm.releaseSelected;
    const selectedView = vm.rbView;
    const selectedLanguage = vm.rbLanguage;
    console.log("EOJ:", selectedEoj, " Release:", selectedRelease, " View:", selectedView, "Language:", selectedLanguage);

    // Appendixのrelease選択の要素を作成
    let firstRelease = 'Z';
    if (!jsonData.devices[selectedEoj].oneOf) {
        firstRelease = jsonData.devices[selectedEoj].validRelease.from;
    } else {
        for (let object of jsonData.devices[selectedEoj].oneOf) {
            firstRelease = ( object.validRelease.from < firstRelease) ? object.validRelease.from : firstRelease;
        }
    }

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    let releaseList = [];
    let i =0;
    while (alphabet[i] != firstRelease) {
        i++
    }
    while (alphabet[i] != latestRelease) {
        releaseList.push({name:alphabet[i]});
        i++
    }
    releaseList.push({name:latestRelease});
    vm.releaseList = releaseList.reverse();
    
    // selectedReleaseがreleaseList内にない場合は、latestReleaseにする
    selectedRelease = ((firstRelease <= selectedRelease) && (selectedRelease <= latestRelease)) ? selectedRelease : latestRelease;
    vm.releaseSelected = selectedRelease;

    // 機器オブジェクトの選択の要素を作成
    let deviceList = [];
    for (const eoj of Object.keys(jsonData.devices)) {
        if (!jsonData.devices[eoj].oneOf) {
            deviceList.push({name:jsonData.devices[eoj].className.ja, eoj:eoj});
        } else {
            for (let object of jsonData.devices[eoj].oneOf) {
                const validFrom = object.validRelease.from;
                const validTo = (object.validRelease.to == 'latest') ? latestRelease : object.validRelease.to;
                if ((validFrom <= selectedRelease) && ( selectedRelease <= validTo )) {
                    deviceList.push({name:object.className.ja, eoj:eoj});
                    break;
                }
            }
        }
    }
    vm.deviceList = deviceList;    

    // 選択された機器のDevice Objectを作成（その後の作業で中身をいじるため、コピーする）
    let deviceObjectOriginal = getDeviceDescriptionObj(selectedEoj, selectedRelease);
    let deviceObject = JSON.parse(JSON.stringify(deviceObjectOriginal));
    
    let id = 0; // index for v-for.
    vm.appendix_list = [];
    for (const [key, property] of Object.entries(deviceObject.elProperties)) {
        let indexObject = null;
        let indexOneOf = null;        
        processOneOf(key, property, id, indexObject, indexOneOf);
    }
}

function processOneOf(key, property, id, indexObject, indexOneOf){
    if (property.data.oneOf) {
        const arrayOneOf = property.data.oneOf;
        for (indexOneOf =0; indexOneOf < arrayOneOf.length; indexOneOf++) {
            property.data = arrayOneOf[indexOneOf];
            createAppendixList(key, property, id, indexObject, indexOneOf);
            id++;
        }
    } else {
        const index = 0;
        createAppendixList(key, property, id, indexObject, indexOneOf);
        id++;
    }    
}


// function: 表示データの作成
//      入力データをもとにappendixを作成し、vm.appendix_listにpushする
//      if ((indexObject == undefined) && (indexOneOf == undefined)) { 全て表示 }
//      else if ((indexObject == 0) && (indexOneOf == 0)) { 全て表示 }
//      else if ((indexObject !== 0) && (indexOneOf == 0)) { 値域,データ型,データサイズ,単位を表示 }
//      else if ((indexObject !== 0) && (indexOneOf !== 0)) { 値域,単位を表示 }
// input: 
//      key:string, EPC(example '0x80')
//      property: object, EL Device Descriptionのproperty object
//      id: number, Vue.jsがv-forで使用するid
//      indexObject:number, objectのelementのindex
//      indexOneOf: number, oneOfのelementのindex
function createAppendixList(key, property, id, indexObject, indexOneOf) {
    let appendix = {};
    let pushFlag = true;
    appendix.epc = key;
    appendix.name = property.propertyName.ja;
    if (property.accessRule.get == "notApplicable") {
        appendix.accessRule = "Set";
    } else if  (property.accessRule.set == "notApplicable") {
        appendix.accessRule = "Get";
    } else {
        appendix.accessRule = "Set/Get";
    }
    if ((property.accessRule.get == "required") || (property.accessRule.set == "required")){
        appendix.accessRuleRequired = "○";
    }
    if (property.accessRule.inf == "required") {
        appendix.inf = "○";
    }
    if (property.note) {
        appendix.note = property.note.ja;
    } else {
        appendix.note = 'empty';
    }
    switch (property.data.type) {
        case 'state':
            appendix.propType = 'state';
            appendix.range = property.data.enum;
            appendix.dataType = 'unsigned char';
            appendix.dataSize = property.data.size;    
            break;
        case 'number':
            appendix.propType = 'number';
            // maxには３けた区切りのコンマを追加
            appendix.range = (new Intl.NumberFormat().format(property.data.minimum)) + ' ~ ' + (new Intl.NumberFormat().format(property.data.maximum));
            appendix.dataType = property.data.format;
            appendix.unit = property.data.unit;
            switch (property.data.format) {
                case 'int8':
                    appendix.dataSize =1;
                    appendix.dataType = 'signed char';
                    break;
                case 'uint8':
                    appendix.dataSize =1;
                    appendix.dataType = 'unsigned char';
                    break;
                case 'int16':
                    appendix.dataSize =2;
                    appendix.dataType = 'signed short';
                    break;
                case 'uint16':
                    appendix.dataSize =2;
                    appendix.dataType = 'unsigned short';
                    break;
                case 'int32':
                    appendix.dataSize =4;
                    appendix.dataType = 'signed long';
                    break;
                case 'uint32':
                    appendix.dataSize =4;
                    appendix.dataType = 'unsigned long';
                    break;
                default:
            }
            break;
        case 'numericValue':
            appendix.propType = 'numericValue';
            appendix.range = property.data.enum;
            appendix.dataType = 'unsigned char';
            appendix.dataSize = property.data.size;
            console.log('numericValue');
            break;
        case 'level':
            appendix.propType = 'level';
            let maxValue = parseInt(property.data.base) + property.data.maximum - 1;
            appendix.range = property.data.base + ' ... 0x' + toStringHex(maxValue, 1) + ': レベル';
            appendix.dataType = 'unsigned char';
            appendix.dataSize = 1;
            break;
        case 'bitmap':
            appendix.propType = 'bitmap';
            appendix.range = 'bitmap';
            appendix.dataType = 'unsigned char';
            appendix.dataSize = property.data.size;
            break;
        case 'date-time':
            appendix.propType = 'date-time';
            appendix.dataType = 'unsigned char';
            appendix.dataSize = (property.data.size) ? property.data.size : 7;
            switch (appendix.dataSize) {
                case 2:
                    appendix.range = 'YYYY';
                    break;
                case 3:
                    appendix.range = 'YYYYMM';
                    break;
                case 4:
                    appendix.range = 'YYYYMMDD';
                    break;
                case 5:
                    appendix.range = 'YYYYMMDDHH';
                    break;
                case 6:
                    appendix.range = 'YYYYMMDDHHMM';
                    break;
                case 7:
                    appendix.range = 'YYYYMMDDHHMMSS';
                    break;
                default:
                    appendix.range = 'date-time';
            }
            break;
        case 'time':
            appendix.propType = 'time';
            appendix.dataType = 'unsigned char x 2';
            appendix.dataSize = (property.data.size) ? property.data.size : 3;
            switch (appendix.dataSize) {
                case 1:
                    appendix.range = 'HH';
                    break;
                case 2:
                    appendix.range = 'HH:MM';
                    break;
                case 3:
                    appendix.range = 'HH:MM:SS';
                    break;
                default:
                    appendix.range = 'time';
            }
            break;
        case 'raw':
            appendix.propType = 'raw';
            appendix.range = 'raw';
            appendix.dataType = 'unsigned char';
            appendix.dataSize = (property.data.minSize == property.data.maxSize) ? (property.data.minSize) : (property.data.minSize + '-' + property.data.maxSize);
            break;
        case 'oneOf':
            appendix.propType = 'oneOf';
            console.log('case oneOf');
            break;
        case 'arrayHeader':
            appendix.propType = 'arrayHeader';
            const minItems = (property.data.minItems) ? property.data.minItems : 1;
            const itemCount = (property.data.minItems == property.data.maxItems) ? minItems : (minItems + ' ~ ' + property.data.maxItems);
            appendix.dataType = property.data.itemSize + 'byte X ' + itemCount;
            break;
        case 'array':
            // display array header
            const arrayHeaderProperty = {
                propertyName:property.propertyName, 
                accessRule:property.accessRule, 
                data:{
                    type:'arrayHeader', 
                    itemSize:property.data.itemSize, 
                    minItems:property.data.minItems, 
                    maxItems:property.data.maxItems
                }
            };
            processOneOf(key, arrayHeaderProperty, id, indexObject, indexOneOf);

            // display array data
            appendix.propType = 'array';
            property.data = property.data.items;
            processOneOf(key, property, id, (indexObject+1), indexOneOf);
            pushFlag = false;
            break;
        case 'objectHeader':
            appendix.propType = 'objectHeader';
            appendix.range = property.data.name + ': ';
            break;
        case 'object':
            const arrayObject = property.data.properties;
            indexObject = (indexObject === null) ? 0 : indexObject;
            for (let i=0; i < arrayObject.length; i++, indexObject++) {
                // display object header
                const objectHeaderProperty = {
                    propertyName:property.propertyName, 
                    accessRule:property.accessRule, 
                    data:{
                        type:'objectHeader', 
                        name:arrayObject[i].name
                    }
                };
                processOneOf(key, objectHeaderProperty, id, indexObject, indexOneOf);

                // display object data
                property.data = arrayObject[i].element;
                processOneOf(key, property, id, (indexObject+1), indexOneOf);
            }
            pushFlag = false;
            break;
        default:
            console.log('default', property.data.type);
    }
    if (property.data.multipleOf) {
        if (property.data.unit) {
            appendix.unit = property.data.multipleOf + ' ' + property.data.unit;
        } else {
            appendix.unit = property.data.unit;
        }
    }
    if (indexOneOf > 0) {
        appendix.epc = '';
        appendix.name = '';
        appendix.dataType = '';
        appendix.dataSize = '';
        appendix.accessRule = '';
        appendix.accessRuleRequired = '';
        appendix.inf = '';
        appendix.note = 'empty';    
    } else if ((indexObject > 0) &&  ((indexOneOf === null) || (indexOneOf === 0))) {
        appendix.epc = '';
        appendix.name = '';
        appendix.accessRule = '';
        appendix.accessRuleRequired = '';
        appendix.inf = '';
        appendix.note = 'empty';    
    }
    appendix.id = id;
    if (pushFlag === true) {
        vm.appendix_list.push(appendix);
    }
}
        
// 数値(number)を16進数表記の文字列に変換する
// 数値のbyte数は(bytes)
// example: toStringHex(10, 1) => "0A"
// example: toStringHex(10, 2) => "000A"
function toStringHex(number, bytes) {
  let str = number.toString(16).toUpperCase();
  while (str.length < 2*bytes) { str = "0" + str; }
      return str;
}

// stringに文字列を挿入
function strIns(str, idx, val){ // str:string（元の文字列）, idx:number（挿入する位置）, val:string（挿入する文字列）
    var res = str.slice(0, idx) + val + str.slice(idx);
    return res;
}

function hex2Array(hex) { // hex: string of this format 0xXXXX or XXXX
    if (hex.slice(0,2) != "0x") {
      hex = "0x" + hex;
    }
    let array =[];
    const bytes = (hex.length - 2)/2;
    for (let i=0; i<bytes; i++) {
      array.push(parseInt(hex.slice((i+1)*2,(i+1)*2+2), 16));
    }
    return array; // array: array of byte data
}

function packetMonitorShowPacketDetail(event){
	if (this.active_packet_id) {
		$('#' + this.active_packet_id).removeClass('active');
		this.active_packet_id = '';
	}
	let t = event.target;
	console.log("t.id: ",t.id);
    $('#' + t.id).addClass('active');
	this.active_packet_id = t.id;

	// 現在選択中のパケット ID
	let id_parts = this.active_packet_id.split('-');
	let pno = parseInt(id_parts[1], 10);
	
    // packetの解析結果の表示
	vm.packetDetail = analyzeData(dataLogArray[pno].data);
}

function packetMonitorUpDownList(event){
	event.preventDefault();
	event.stopPropagation();
	// 選択中のパケット行がなければ終了
	if (!this.active_packet_id) {
		return;
	}
	// 現在選択中のパケット ID
	let id_parts = this.active_packet_id.split('-');
	let pno = parseInt(id_parts[1], 10);

	let c = event.keyCode;
	let k = event.key;
	if (c === 38 || k === 'ArrowUp') {
		// 上矢印キー
		if (vm.rbOrder == "normalOrder") {
    		if (pno-- <0 ) {pno = 0}
		} else {
    		if (pno++ >= dataLogArray.length ) {pno = dataLogArray.length -1}		
		}
	} else if (c === 40 || k === 'ArrowDown') {
		// 下矢印キー
		if (vm.rbOrder == "normalOrder") {
    		if (pno++ >= dataLogArray.length ) {pno = dataLogArray.length -1}
		} else {
    		if (pno-- <0 ) {pno = 0}
		}
	} else {
		return;
	}
	// 遷移したパケット行にフォーカスする
	$('#packet-' + pno).focus();
}