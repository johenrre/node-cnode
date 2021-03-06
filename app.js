const express = require('express')
const nunjucks = require('nunjucks')
const bodyParser = require('body-parser')
const session = require('cookie-session')

/**
 * 服务器配置 cors
 * 允许跨域请求
 */
// 服务器端配置 引入 cors 模块
// const cors = require('cors')

// 配置 cors, 允许所有 cors 请求通过
//app.use(cors())

const { log } = require('./utils')

// 先初始化一个 express 实例
const app = express()

/**
 * 设置 bodyParser
 */
// express 添加bodyParser
app.use(bodyParser.urlencoded({
    extended: false,
}))
// 设置 bodyParser 解析 json 格式的数据
// application/json
app.use(bodyParser.json())

/**
 * 设置 session
 */
const { secretKey } = require('./config')
app.use(session({
    secret: secretKey,
}))

// 配置 nunjucks 模板, 第一个参数是模板文件的路径
// nunjucks.configure 返回的是一个 nunjucks.Environment 实例对象
const env = nunjucks.configure('templates', {
    autoescape: true,
    express: app,
    noCache: true,
})

// nunjucks 添加自定义的过滤器
env.addFilter('formattedTime', (ts) => {
    // 引入自定义的过滤器 filter
    const formattedTime = require('./filter/formattedTime')
    const s = formattedTime(ts)
    return s
})


// 配置静态资源文件, 比如 js css 图片
const asset = __dirname + '/static'
app.use('/static', express.static(asset))

// 有时候在页面跳转的时候需要提示用户一些信息,
// 比如某样操作需要管理员权限, 跳转到新页面的时候就要把这个信息告知用户
app.use((request, response, next) => {
    // response.locals 会把数据传到页面中
    // 这里的处理方式是先把 flash 数据放在 session 中
    // 然后把 flash 里面的数据放在 response.locals 中
    // 接着删除 response.session 中的 flash 数据,
    // 这样只会在当前这次请求中使用 flash 数据
    log('flash', request.session.flash);
    response.locals.flash = request.session.flash
    delete request.session.flash
    next()
})

// 引入路由文件
const topic = require('./routes/topic')
const index = require('./routes/index')
const reply = require('./routes/reply')

// 引入 board 路由
// 这次 exports 的是 topic: main 的形式
// 所以需要解包
const { board } = require('./routes/board')
const { user } = require('./routes/user')

// 使用 app.use(path, route) 的方式注册路由程序
app.use('/', index)
app.use('/topic', topic)
app.use('/reply', reply)
app.use('/board', board)
app.use('/user', user)


const apiTopic = require('./api/topic')
app.use('/api/topic', apiTopic)


// 注意, 404 和 500 的路由一定是放在所有路由后面的
app.use((request, response) => {
    response.status(404)
    response.render('404.html')
})

app.use((error, request, response) => {
    console.error(error.stack)
    response.status(500)
    response.send('定制的 500 错误')
})

// 指定了默认的 host 和 port, 因为用的是默认参数, 当然可以在调用的时候传其他的值
const run = (port=3000, host='') => {
    // app.listen 方法返回一个 http.Server 对象, 这样使用更方便
    // 实际上这个东西的底层是我们以前写的 net.Server 对象
    const server = app.listen(port, host, () => {
        const address = server.address()
        host = address.address
        port = address.port
        log(`listening server at http://${host}:${port}`)
    })
}

if (require.main === module) {
    const port = 5000
    // host 参数指定为 '0.0.0.0' 可以让别的机器访问你的代码
    const host = '0.0.0.0'
    run(port, host)
}
