require('../css/mapSearchHouse.scss');
require('./utils/layer');
// 百度地图API功能
let { mapApi } = require('./conponents/mapApi');
let tpl = require('./utils/template');
require('./mork/mockData');
let poiLng = $('.mapPoint').attr('mapCenter');
let Arr = [];
let polygon = null;
let overlay = null;
var overlays = [];
var map = new BMap.Map('map',{minZoom:8,maxZoom:17,enableMapClick:false});
var poi = new BMap.Point(poiLng.split(',')[0],poiLng.split(',')[1]);
map.centerAndZoom(poi,17);
map.enableScrollWheelZoom();

var overlaycomplete = function(e){
    overlays.push(e.overlay);
};
//定义线的颜色
var styleOptions = {
    strokeColor:"#00ac66",    //边线颜色。
    fillColor:"#00ac66",      //填充颜色。当参数为空时，圆形将没有填充效果。
    strokeWeight: 5,       //边线的宽度，以像素为单位。
    strokeOpacity: 1,    //边线透明度，取值范围0 - 1。
    fillOpacity: 0.3,      //填充的透明度，取值范围0 - 1。
    strokeStyle: 'solid', //边线的样式，solid或dashed。
};
//实例化鼠标绘制工具
var drawingManager = new BMapLib.DrawingManager(map, {
    isOpen: false, //是否开启绘制模式
    // enableDrawingTool: true, //是否显示工具栏
    drawingToolOptions: {
        anchor: BMAP_ANCHOR_TOP_RIGHT, //位置
        offset: new BMap.Size(5, 5), //偏离值
    },
    polygonOptions: styleOptions, //多边形的样式\
    polylineOptions : styleOptions,
});
//添加鼠标绘制工具监听事件，用于获取绘制结果
drawingManager.addEventListener('overlaycomplete', overlaycomplete);
//确认打开画板
$('.tools').on('click',function () {
    if(map.getZoom() == 17){
        var state = $(this).hasClass('active');
        clearAll();
        Arr.length = 0;
        map.clearOverlays();
        $('.house-list').stop().animate({left : '-440px'},600).removeClass('active').find('.house-close-list').attr('state',0);
        $('.alert-box').remove();
        if(state){
            $(this).removeClass('active');
            $(this).find('span').text('画圈找房');
            $('.palette').hide();
            // $('.tools-reset').hide();
            drawingManager.close();
        }else{
            $(this).addClass('active');
            $(this).find('span').text('重新画圈');
            // $('.tools-reset').hide();
            $('.palette').show();
            draw();
        }
    }else{
        layer.msg('请向上滚动鼠标滑轮将地图放大到最大级别',{icon : 0})
    }
});
//开始画画
$('.palette').on('mousedown',function (e) {
    var point = getDrawPoint(e);
    Arr.push(point);
    overlay = new BMap.Polyline(Arr,drawingManager.polylineOptions);
    map.addOverlay(overlay);
    overlays.push(overlay);
    $('.palette').bind('mousemove',function (e) {
        var point = getDrawPoint(e);
        Arr.push(point);
        overlay.setPath(Arr)
    });
});
//当鼠标抬起画完的时候
$('.palette').on('mouseup',function () {
    $('.palette').unbind('mousemove');
    showPolygon(Arr);
    $('.palette').hide();
    // $('.tools-reset').show();
    $('.tools').removeClass('active').find('span').text('重新画圈');
    drawingManager.close();
    var pathLeft = $(polygon.V).offset().left;
    var pathTop = $(polygon.V).offset().top;
    var jianT = $('.map_box').offset().top;
    var centerXlng = pathLeft + (polygon.V.getBoundingClientRect().width/2);
    var centerYlat = pathTop + (polygon.V.getBoundingClientRect().height/2);
    setMapCentre({
        x : centerXlng,
        y : centerYlat
    });
    ajax({
        url : mapApi.mapVillageSell,
        ol : polygon.Ou.Ol,
        xl : polygon.Ou.xl
    },function (res) {
        if(res.data.list.length == 0){return false}else{
            let $list = $(res.data.list);
            $list.each(function (index,item) {
                var point = new BMap.Point(item.lng,item.lat);
                if(BMapLib.GeoUtils.isPointInPolygon(point, polygon)){
                    addLabel(item)
                }
            });
        }
    })
});
//marker的处理逻辑
$('#map').on('mouseover ','.mapMark-list',function (e) {
    e.stopPropagation();
    var $that = $(this);
    $that.find('.alert-box').show();
    $that.parent().siblings().find('.mapMark-list').find('.alert-box').hide();
    $that.parent().css({zIndex : 100}).siblings().css({zIndex : 0});
    $that.addClass('active').parent().siblings().find('.mapMark-list').removeClass('active');
});
$('#map').on('mouseout ','.mapMark-list',function (e) {
    e.stopPropagation();
    var $that = $(this);
    $that.find('.alert-box').hide();
    $that.removeClass('active')
});
//当点击maker的时候
let $realName = $('.house-list .real_name');
let $realInfo = $('.house-list .info');
let $realAverage = $('.house-list .average-num');
let $realMouth = $('.house-list .month');
let $realNum = $('.house-list .house_num');
let $houseNav = $('.house-list .house_nav');
$('#map').on('click','.mapMark-list',function () {
    // var lng = $(this).attr('lng');
    // var lat = $(this).attr('lat');
    $(this).find('.alert-box').show();
    $(this).parent().css({zIndex : 100}).siblings().css({zIndex : 0});
    $(this).addClass('clickActive').parent().siblings().find('.mapMark-list').removeClass('clickActive');
    //给信息面板赋值
    $realName.text($(this).attr('houseName'));
    $realInfo.text($(this).attr('info'));
    $realAverage.text($(this).attr('average')? $(this).attr('average') : '暂无均价');
    $realMouth.text($(this).attr('month'));
    $realNum.text($(this).attr('num'));
    $houseNav.attr('id',$(this).attr('id'));
    //获取响应小区的房源列表
    ajax({
        url : mapApi.mapVillageSellList,
        data : {
            id :  $(this).attr('id')
        }
    },function (res) {
        $houseNav.find('li').eq(0).addClass('active').siblings().removeClass('active');
        $houseNav.find('li').not($houseNav.find('li').eq(0)).attr('sortState',0);
        $('.house_container').html(tpl('houseListHtml',res.data))
    });
    //修改房源状态弹窗
    $('.house-list').addClass('active').stop().animate({
        left : '0'
    },600).find('.house-close-list').attr('state',0).text('<');
    //
});
$('.house_container').on('click','.houseInfo',function () {
    window.open($(this).attr('infoUrl'))
});
//点击排序列表
var flag = true;
$houseNav.on('click','li',function () {
    if(flag){
        flag = false;
        $(this).addClass('active').siblings().removeClass('active');
        var id = $(this).parent().attr('id');
        var state = $(this).attr('state');
        var sortState = $(this).attr('sortState');
        if(sortState && sortState == 0){
            $(this).attr('sortState',1)
        }else{
            $(this).attr('sortState',0)
        }
        ajax({
            url : mapApi.mapVillageSellList,
            data : {
                id : id,
                state : state ? state : '',
                sortState : sortState ? sortState: ''
            }
        },function (res) {
            $('.house_container').html(tpl('houseListHtml',res.data));
            flag = true
        })
    }
});
//点击信息面板的收起图标
$('body').on('click','.house-close-list',function () {
    var state = $(this).attr('state');
    if(state == 0){
        $(this).closest('.house-list').stop().animate({left : "-440px"},600);
        $(this).attr('state',1);
        $(this).text('>')
    }else{
        $(this).closest('.house-list').stop().animate({left : "0"},600);
        $(this).attr('state',0);
        $(this).text('<')
    }
});
// map.addEventListener('click',function (e) {
//     console.log(e);
// });
function ajax(opts,suc) {
    $.ajax({
        url : opts.url,
        data : opts.data ? opts.data : '',
        dataType : 'json',
        type : opts.type ? opts.type : 'post',
        success : function (res) {
            if(!res.errcode == 0){layer.msg(res.msg,{icon : 2});return false}
            suc(res)
        },
        error : function () {
            console.log('服务端错误')
        }
    })
}
//设置地图中心点
function setMapCentre(opts) {
    var x = opts.x;
    var y = opts.y;
    var pixel = new BMap.Pixel(x, y);
    var point = map.pixelToPoint(pixel);
    point = new BMap.Point(point.lng,point.lat);
    map.panTo(point)
}
//获取坐标点
function getDrawPoint(e) {
    var x = e.offsetX || 0;
    var y = e.offsetY || 0;
    var pixel = new BMap.Pixel(x, y);
    var point = map.pixelToPoint(pixel);
    point = new BMap.Point(point.lng,point.lat);
    return point;
}
//开启绘画模式
function draw(type){
    drawingManager.open();
    drawingManager.setDrawingMode(type);
}
//清除绘画
function clearAll() {
    for(var i = 0; i < overlays.length; i++){
        map.removeOverlay(overlays[i]);
    }
    overlays.length = 0;
}
//添加划线
function showPolyline(arr) {
    var polyline = new BMap.Polyline(arr, styleOptions);
    map.addOverlay(polyline);   //增加划线
}
//添加多边图
function  showPolygon(arr){
    polygon = new BMap.Polygon(arr, styleOptions);  //创建多边形
    map.addOverlay(polygon);   //增加多边形
    overlays.push(polygon); //是否把该图像加入到编辑和删除行列
}
//添加标注
function addLabel(opt) {
    var point = new BMap.Point(opt.lng,opt.lat);
    var opts = {position : point,offset : new BMap.Size(0,0)};
    var markerlabel = new BMap.Label('<div class="mapMark-list" houseName="'+opt.name+'" num="'+opt.house_num+'" info="'+opt.year+'.'+opt.house_type+'.'+opt.num+'" id="'+opt.id+'" average="'+opt.average+'" month="'+opt.month+'"><span class="name">'+opt.name+'</span><span>'+opt.house_num+'套</span><i class="mapMark-list-arr"></i><div class="info-box alert-box"><div class="img-box l"><img src="'+opt.img+'"></div><div class="l right"><p class="title">'+opt.title+'</p><p class="text">'+opt.year+'/'+opt.type+'/'+opt.num+'</p><p class="text">'+opt.real+'</p></div><div class="alert-box-arr"></div></div></div>',opts);
    markerlabel.setStyle({
        border:'none',
        backgroundColor:'none'
    });
    map.addOverlay(markerlabel);
    setTimeout(function () {
        var D = $(markerlabel.V).find('.mapMark-list');
        var DW = D.outerWidth(true);
        var DH = D.outerHeight(true);
        var Da = 8.51;
        $('.mapMark-list').parent().css({zIndex : 100});
        $('.mapMark-list').css({
            top : -(Da + DH),
            left : -DW/2,
        })
    })
}







