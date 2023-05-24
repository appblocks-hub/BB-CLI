
const blockTypes = [
    ['package', 1, ''],
    ['ui-container', 2, 'view/container'],
    ['ui-elements', 3, 'view/elements'],
    ['ui-dep-lib', 8, ''],
    ['function', 4, 'functions'],
    ['data', 5, ''],
    ['shared-fn', 6, 'functions/shared-fns'],
    ['job', 7, 'jobs'],
]

export enum BlockTypes {
    package = 1,
    'ui-container' = 2,
    'ui-elements' = 3,
    function = 4,
    data = 5,
    'shared-fn' = 6,
    job = 7,
    'ui-dep-lib' = 8
}
BlockTypes.function