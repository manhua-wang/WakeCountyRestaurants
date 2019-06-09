var controls = document.querySelector('#controls');
var select = document.querySelector('select');
var findButton = document.querySelector('#findRestaurants');
findButton.addEventListener('click', getRestaurants);
var rstList = document.querySelector('#rstList');

var rstObj;
loadRstData();

var zipObj;
loadZipData();

function loadRstData() {
    var rstUrl = 'https://data.townofcary.org/api/records/1.0/search/?dataset=wake-county-restaurants&rows=1000&facet=city';
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === XMLHttpRequest.DONE && httpRequest.status == 200) {
            var wcrText = httpRequest.response;
            rstObj = JSON.parse(wcrText);

            cities = getCities();
            for (i=0; i<cities.length; i++) {
                var opt = document.createElement('option');
                opt.textContent = cities[i];
                select.appendChild(opt);
            }
        }
    }
    httpRequest.open('GET', rstUrl);
    httpRequest.send();
}

function getCities() {
    var citySet = new Set();
    var records = rstObj['records'];
    for (i=0; i<records.length; i++) {
        if ('city' in records[i]['fields']) {
            citySet.add(records[i]['fields']['city']);
        }
    }
    citySet.add('ALL');
    return Array.from(citySet).sort();
}

function loadZipData() {
    var zipUrl = 'https://maps.wakegov.com/arcgis/rest/services/Boundaries/ZipCodes/MapServer/0/query?where=1%3D1&outFields=ZIPNAME,ZIPNUM&returnGeometry=false&orderByFields=ZIPNUM%20ASC&outSR=4326&f=json';
    var httpRequest = new XMLHttpRequest;
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === XMLHttpRequest.DONE && httpRequest.status == 200) {
            var zipText = httpRequest.response;
            zipObj = JSON.parse(zipText);

            zipDic = createZipDic();
        }
    }
    httpRequest.open('GET', zipUrl);
    httpRequest.send();
}

function createZipDic() {
    var zipDic = new Set();
    for (i=0; i<zipObj['features'].length; i++){
        var zipPairs = zipObj['features'][i]['attributes'];
        if (zipPairs['ZIPNAME'] != null) {
            zipDic.add(zipPairs['ZIPNUM']);
            zipDic[zipPairs['ZIPNUM']] = zipPairs['ZIPNAME'];
        }
    }
    return Array.from(zipDic).sort();
}

function getRestaurants() {
    // clear previous results
    while (rstList.hasChildNodes()) {
        rstList.removeChild(rstList.firstChild);
    }

    // show headers
    var h2 = document.getElementsByTagName('h2');
    for (i=0; i<h2.length; i++) {
        h2[i].style.display = 'block';
    }
    var h4 = document.getElementsByTagName('h4');
    for(i=0; i<h4.length; i++) {
        h4[i].style.display = 'block';
    }

    // create array for selected restaurants, types, open date, coordinate, address, phone number;
    rstName = [];
    rstType = [];
    rstYear = [];
    rstX = [];
    rstY = [];
    rstAddress = [];
    rstPhone = [];
    typeSet = [];
    yearSet = [];

    for(i=0; i<rstObj['records'].length; i++) {
        var fields = rstObj['records'][i]['fields'];
        var type = fields['facilitytype'];
        var year = fields['restaurantopendate'].toString().slice(0, 4);

        if('city' in fields) {
            var ct = fields['city'];
        }
        else if ('postalcode' in fields) {
            if (fields['postalcode'] in zipDic) {
                ct = zipDic[fields['postalcode']];
            }
        }

        if((city.value === "ALL") || (ct == city.value)) {
            rstName.push(fields['name']);
            rstType.push(fields['facilitytype']);
            rstYear.push(year);
            rstX.push(fields['x']);
            rstY.push(fields['y']);
            rstAddress.push(fields['address1']);
            rstPhone.push(fields['phonenumber'])

            // create typeArray for typeChart
            if (!(type in typeSet)) {
                typeSet[type] = 1;
            }
            else {
                typeSet[type]++;
            }
            // create yearArray for yearChart
            if (!(year in yearSet)) {
                yearSet[year] = 1;
            }
            else {
                yearSet[year]++;
            }
        }
    }

    displayResultTable();

    // prepare dataArray for chart display
    var typeArray = new Array();
    var yearArray = new Array();
    i = 0
    for (type in typeSet) {
        typeArray[i] = [type, typeSet[type]];
        i++;
    }
    j = 0;
    for(year in yearSet) {
        yearArray[j] = [year, yearSet[year]];
        j++
    }

    // create chart
    var chartsGroup = document.querySelector('#charts-group');
    var typeChart = document.createElement('div');
    typeChart.setAttribute('id', 'typeChart');
    chartsGroup.appendChild(typeChart);
    displayTypeChart(typeArray);
    var yearChart = document.createElement('div');
    yearChart.setAttribute('id', 'yearChart');
    chartsGroup.appendChild(yearChart);
    displayYearLine(yearArray);
}

function displayResultTable() {
    // generate restaurants list
    // create table head, 1 <tr> with 3 <th>
    var rstTable = document.createElement('table');
    var thead = document.createElement('thead');
    var column = ['Restaurant Name', 'Type', 'Open Year'];
    var width = ['50%', '30%', '20%'];
    var tableRow = document.createElement('tr');
    thead.appendChild(tableRow);
    rstTable.appendChild(thead);
    for (i=0; i<column.length; i++) {
        var th = document.createElement('th');
        th.setAttribute('width', width[i]);
        th.appendChild(document.createTextNode(column[i]));
        tableRow.appendChild(th);
    }

    // create table body
    var tbody = document.createElement('tbody');
    rstTable.appendChild(tbody);
    // create each <tr> row in the table, each with 3 <td> cells
    for (i=0; i<rstName.length; i++) {
        var listRow = document.createElement('tr');
        var listContent = [rstName[i], rstType[i], rstYear[i]];
        tbody.appendChild(listRow);
        for (j=0; j<listContent.length; j++) {
            var td = document.createElement('td');
            td.setAttribute('width', width[j]);

            if (j == 0) { // add link to restaurant name
                var link = document.createElement('a');
                link.setAttribute('onclick', 'showMap(' + rstX[i] + ',' + rstY[i] + ', "' + rstName[i] + '" , "' + rstAddress[i] + '", "' + rstPhone[i] + '")');
                link.textContent = rstName[i];
                td.appendChild(link);
            }
            else {
                td.appendChild(document.createTextNode(listContent[j]));
            }
            listRow.appendChild(td);
        }
    }
    rstList.appendChild(rstTable);
}

function displayTypeChart(typeArray) {
    google.charts.load("current", {packages:['corechart']});
    google.charts.setOnLoadCallback(drawChart);
    function drawChart() {
        var data = new google.visualization.DataTable();
        data.addColumn("string", "Restaurant Type");
        data.addColumn("number", "Count");
        data.addRows(typeArray);
        var options = {
            title: "Restaurant types in " + city.value,
            width: 550,
            height: 300,
            backgroundColor: '#F3F7F9'
        };
        var chart = new google.visualization.PieChart(document.querySelector("#typeChart"));
        chart.draw(data, options);
    }
}

function displayYearLine(yearArray) {
    google.charts.load('current', {packages: ['corechart', 'line']});
    google.charts.setOnLoadCallback(drawBasic);
    function drawBasic () {
        var data = new google.visualization.DataTable();
        data.addColumn("string", "Year");
        data.addColumn("number", "Number of Restaurants Opened");
        data.addRows(yearArray);
        var options = {
            title: "Open Restaurant Trends in " + city.value,
            width: 550,
            height: 300,
            backgroundColor: '#F3F7F9',
            colors: ['#BC412B'],
            legend: 'none',
            vAxis: {
                title: "Number of Restaurants Opened"
            }
        };
        var chart = new google.visualization.LineChart(document.querySelector("#yearChart"));
        chart.draw(data, options);
    }
}

function showMap (x, y, name, address, phone) {
    document.querySelector('#map-container').innerHTML = "<h3>" + name + "</h3><section id='map'></section>" + "<p> Location: " + address + "</p><p>Phone Number: " + phone;

    var mymap = L.map('map').setView([y, x], 13);
    mymap.setView([y, x], 13);

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(mymap);

    L.marker([y, x], {color: '#BC412B'}).addTo(mymap);
}