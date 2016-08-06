
/**基于 FIS3 配置目录规范和部署规范 */ 

var path = require('path');

var exports = module.exports = function(fis) {

  // 帮当前目录的查找提前在 global 查找的前面，同时又保证 local 的查找是优先的。
  if (fis.require.paths && fis.require.paths.length) {
     fis.require.paths.splice(1, 0, path.join(__dirname, 'node_modules'));
  }

  fis.require.prefixes.unshift('cooker'); // 优先加载 cooker 打头的插件。
  fis.cli.name = 'cooker';
  var _fis3version = fis.cli.info.version
  fis.cli.info = require('./package.json');
  fis.cli.info['_fis3version'] = _fis3version;
  fis.cli.version = require('./version.js'); 

  function getTransformRuntimeModules() {
    var defaultModules = ['fetch-ie8', 'whatwg-fetch']
    var m = fis.get('transform-runtime-modules') || []
    m.forEach(function(item, i ){
        if (!~defaultModules.indexOf(item)) {
            defaultModules.push(item)
        }
    })
    return '/node_modules/' + defaultModules.join(",/node_modules/")
 }

  // 设置当前工程node_modules中需要babel-transform-runtime处理的第三方库
  fis.set('__transform-runtime-modules__', getTransformRuntimeModules())

  // 按需编译
  fis.set('project.files', ['/src/index.html', 'map.json','/mock/**']);
  // 设置忽略的目录
  fis.get('project.ignore').push('/prod/**');
  fis.get('project.ignore').push('/dist/**');

  //fis3-hook-commonjs, // 模块化支持 commonjs 规范，适应 mod.js
  fis.hook('commonjs', {
    baseUrl: './src/modules',
    extList: ['.js', '.jsx']
  });

  // 改用 npm 方案，而不是用 fis-components
  fis.unhook('components');
  fis.hook('node_modules',{
    //env: JSON.stringify("development"), // 永远都替换成 development  、 production
    ignoreDevDependencies: true // 忽略掉 dev 模块，可以提速。
  });

  // mock目录不做require解析, 按nodejs逻辑执行
  fis.match("/mock/**.js", {
    ignoreDependencies: true
  })

  // src目录下的发布到根目录
  fis.match('/src/(**)', {
      release: '/$1'
  })

  // index.html设置
  fis.match('/src/index.html', {
      parser: false,
      useCache: false
  })
  
  // 用babel编译
  fis.match('{*.jsx,{/${__transform-runtime-modules__},/src/modules}/**.js}', {
    rExt: 'js',
    parser: [fis.plugin('babel',{
      presets: ["es2015-ie","react","stage-0"],
      plugins: [
        "add-module-exports",
        "transform-decorators-legacy", 
        "transform-runtime",
        ["antd"]
      ]
    })],
    postprocessor: fis.plugin("es3ify") 
  });

  // 模块化 js
  fis.match('/{node_modules,src/modules}/**.{js,jsx}', {
    isMod: true
  });

  // 添加css和image加载支持
  fis.match('*.{js,jsx}', {
      preprocessor: [
        fis.plugin('js-require-css'),
        fis.plugin('js-require-file', {
          useEmbedWhenSizeLessThan: 10 * 1024 // 小于10k用base64
        })
      ]
  })

  // 转换为es3, 兼容IE8
  fis.match('/node_modules/**.js', {
      postprocessor: fis.plugin("es3ify") 
  })

  // less编译
  fis.match('*.less', {
    parser: fis.plugin('less'),
    rExt: '.css'
  });

 // 自动给 css 属性添加前缀，让标准的 css3 支持更多的浏览器.
  fis.match('*.{css,less,scss}', {
    preprocessor: fis.plugin('autoprefixer', {
      "browsers": ["Android >= 2.1", "iOS >= 4", "ie >= 8", "firefox >= 15"],
      "cascade": true
    })
  })

  //  用 loader 来自动引入资源。
  fis.match('::package', {
    postpackager: fis.plugin('loader', {
        useInlineMap: true
    })
  });

  // ======= 在 prod 环境下，开启各种压缩和打包 =============
  fis.media('prod')
    .match('*.{js, css, less, sass, scss}', { // 所有js, css 加 hash
      useHash: true
    })
    .match('::image', {  // 所有图片加 hash
      useHash: true
    })
    .match('*.{js,jsx}', {
    optimizer: fis.plugin('uglify-js')
    })
    .match('*.{css, less, sass, scss}', {
      optimizer: fis.plugin('clean-css')
    })
    .match('*.png', {
      optimizer: fis.plugin('png-compressor')
    })
}

exports.init = exports;

