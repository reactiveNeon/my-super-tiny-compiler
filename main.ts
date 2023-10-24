interface Token {
    type: string
    value: string
}

interface LispASTNode {
    type:
        | "NumberLiteral"
        | "StringLiteral"
        | "CallExpression"
        | "Program"
    value?: string
    params?: LispASTNode[]
    name?: string
    body?: LispASTNode[]
    _newAstRef?: CASTNode[]
}

interface CASTNode {
    type:
        | "NumberLiteral"
        | "StringLiteral"
        | "CallExpression"
        | "ExpressionStatement"
        | "Identifier"
        | "Program"
    value?: string
    callee?: CASTNode
    arguments?: CASTNode[]
    name?: string
    body?: CASTNode[]
    expression?: CASTNode
}

type Visitor = {
    [key in LispASTNode["type"]]?: {
        enter?(node: LispASTNode, parent: LispASTNode | null): void
        exit?(node: LispASTNode, parent: LispASTNode | null): void
    }
}

function tokenizer(input: string): Token[] {
    const tokens: Token[] = []

    const parens = new Map<string, string>([
        ["(", "paren"],
        [")", "paren"],
    ])

    const WHITESPACE = /\s/
    const NUMBER = /[0-9]/
    const LETTER = /[a-z]/i

    let i = 0
    while (i < input.length) {
        let char = input[i]

        if (parens.has(char)) {
            tokens.push({ type: parens.get(char)!, value: char })
            ;++i
            continue
        }

        if (WHITESPACE.test(char)) {
            ;++i
            continue
        }

        if (NUMBER.test(char)) {
            let value = ""
            value += char
            char = input[++i]

            while (NUMBER.test(char)) {
                value += char
                char = input[++i]
            }

            tokens.push({ type: "number", value: value })
            continue
        }

        if (char === '"') {
            let value = ""

            char = input[++i]
            while (char !== '"') {
                value += char
                char = input[++i]
            }
            char = input[++i]

            tokens.push({ type: "string", value: value })
            continue
        }

        if (LETTER.test(char)) {
            let value = ""
            value += char
            char = input[++i]

            while (LETTER.test(char)) {
                value += char
                char = input[++i]
            }

            tokens.push({ type: "name", value: value })
            continue
        }

        throw new TypeError("Character " + char + " not identified")
    }

    return tokens
}

function parser(tokens: Token[]): LispASTNode {
    const ast: LispASTNode = {
        type: "Program",
        body: [],
    }

    let i = 0
    while (i < tokens.length) {
        const node = walk()
        ast.body!.push(node)
    }

    function walk(): LispASTNode {
        let token = tokens[i]

        if (token.type === "number") {
            ;++i
            return {
                type: "NumberLiteral",
                value: token.value,
            }
        }

        if (token.type === "string") {
            ;++i
            return {
                type: "StringLiteral",
                value: token.value,
            }
        }

        if (token.type === "paren" && token.value === "(") {
            token = tokens[++i]

            const node: LispASTNode = {
                type: "CallExpression",
                name: token.value,
                params: [],
            }

            token = tokens[++i]

            while (
                token.type !== "paren" ||
                (token.type === "paren" && token.value !== ")")
            ) {
                const paramNode = walk()
                node.params!.push(paramNode)
                token = tokens[i]
            }

            ;++i
            return node
        }

        throw new TypeError(
            "Token not identified: " + token.type + " " + token.value,
        )
    }

    return ast
}

function traverser(ast: LispASTNode, visitor: Visitor) {
    function traverseArray(nodes: LispASTNode[], parent: LispASTNode | null) {
        nodes.forEach(node => {
            traverseNode(node, parent)
        })
    }

    function traverseNode(node: LispASTNode, parent: LispASTNode | null) {
        const methods = visitor[node.type]

        if(methods && methods.enter) {
            methods.enter(node, parent)
        }

        switch(node.type) {
            case "Program":
                traverseArray(node.body!, node)
                break
            case "CallExpression":
                traverseArray(node.params!, node)
                break
            case "NumberLiteral":
            case "StringLiteral":
                break;
            default:
                throw new TypeError()
        }

        if(methods && methods.exit) {
            methods.exit(node, parent)
        }
    }

    traverseNode(ast, null)
}

function transformer(ast: LispASTNode): CASTNode {
    const newAst: LispASTNode = {
        type: "Program",
        body: []
    }

    ast._newAstRef = newAst.body

    traverser(ast, {
        NumberLiteral: {
            enter(node, parent) {
                parent?._newAstRef?.push({
                    type: "NumberLiteral",
                    value: node.value
                })
            }
        },
        StringLiteral: {
            enter(node, parent) {
                parent?._newAstRef?.push({
                    type: "StringLiteral",
                    value: node.value
                })
            }
        },
        CallExpression: {
            enter(node, parent) {
                let expression: CASTNode = {
                    type: "CallExpression",
                    callee: {
                        type: "Identifier",
                        name: node.name
                    },
                    arguments: [],
                }

                node._newAstRef = expression.arguments

                if(parent?.type !== "CallExpression") {
                    expression = {
                        type: "ExpressionStatement",
                        expression: expression
                    }
                }
                
                parent?._newAstRef?.push(expression)
            }
        }
    })

    return newAst
}

function codeGenerator(ast: CASTNode): string {
    switch(ast.type) {
        case "NumberLiteral":
            return ast.value!
        case "StringLiteral":
            return '"' + ast.value! + '"'
        case "Identifier":
            return ast.name!
        case "CallExpression":
            return (
                codeGenerator(ast.callee!) +
                "(" +
                ast.arguments!.map(codeGenerator).join(", ") +
                ")"
            )
        case "ExpressionStatement":
            return codeGenerator(ast.expression!) + ";"
        case "Program":
            return ast.body!.map(codeGenerator).join("\n")
        default:
            throw new TypeError(ast.type)
    }
}

// const sample_input = "(add 2 (substract 4 2))"

const sample_input = prompt("Enter Lisp code: ")

if(sample_input === null) {
    throw new TypeError("No input provided")
}

const tokens = tokenizer(sample_input)
const ast = parser(tokens)
const newAst = transformer(ast)
const sample_output = codeGenerator(newAst)

console.log(sample_input)
console.log(sample_output)

// console.log(tokens)
// console.log(JSON.stringify(ast, null, 2))
// console.log(JSON.stringify(newAst, null, 2))
