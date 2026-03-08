from copy import deepcopy

DEFAULT_COUPLE_PROFILE = {
    "schema_version": "v1",
    "location": {
        "city": "Sao Paulo",
        "neighborhood": "Campo Belo",
        "country": "Brazil",
        "max_drive_minutes": 40,
        "transport": "car",
        "avoid_going_out_when_rain": True,
        "weekend_wake_time": "10:00",
    },
    "lifestyle": {
        "avoid_crowded_places": True,
        "avoid_bar": True,
        "avoid_nightclub": True,
        "preferences": ["romantic", "fun", "instagrammable", "small", "cozy"],
    },
    "interests": {
        "topics": ["technology", "science", "psychology", "astrology"],
        "parks": ["Villa-Lobos"],
        "cinema": {
            "favorite_style": ["suspense", "plot twist", "without nudity", "not horror"],
            "favorite_titles": [
                "A Walk to Remember",
                "Interstellar",
                "Titanic",
                "Searching",
                "Gone Girl",
                "Parasite",
                "The Others",
                "Signs",
                "The Butterfly Effect",
            ],
        },
        "series": ["This Is Us", "Gossip Girl", "The O.C.", "MasterChef", "The Voice", "The Bear"],
    },
    "dining": {
        "dining_out": [
            {
                "name": "Lellis Trattoria",
                "dishes": ["ravioloni de queijo com molho napolitana", "bife a milanesa"],
            },
            {"name": "Libertango", "dishes": ["ojo de bife com batata ou legumes"]},
            {"name": "Pizzaria Graminha", "dishes": ["portuguesa", "pizza de chocolate"]},
            {"name": "Carioca Pizzaria (Ibiuna)", "dishes": ["toscana com alho", "banana nevada"]},
            {"name": "Charles", "dishes": ["rodizio"]},
            {"name": "Issho", "dishes": ["yakissoba"]},
        ],
        "delivery": ["Patties", "Z-Deli", "Issho"],
        "likes": ["cafes", "bookstores"],
        "favorite_bookstore": "Livraria da Travessa (Pinheiros)",
        "best_time_for_bookstore": "near closing",
    },
    "culture": {
        "liked_exhibitions": ["Jung", "Nise da Silveira", "Jardim de Luzes", "Dopamine Land"],
        "wishlist": ["Theatro Municipal", "Planetario"],
    },
    "travel": {
        "favorite_destinations": [
            "Campos do Jordao",
            "Santo Antonio do Pinhal",
            "Itu",
            "Holambra",
            "Aguas de Lindoia",
            "Pedreira",
            "Ibiuna",
            "Sao Roque",
            "Mairinque",
        ]
    },
    "health": {
        "allergies": {
            "camila": [
                "nuts",
                "tree nuts",
                "mushrooms",
                "celery",
                "pepper",
                "shrimp",
                "brilliant blue dye",
                "almond",
            ]
        }
    },
}

DEFAULT_MEMBERS = [
    {
        "full_name": "Alex da Cunha Marroig",
        "email": "alex.c.marroig@gmail.com",
        "birth_date": "1992-02-28",
        "drinks_alcohol": False,
        "smokes": False,
        "occupation": "",
        "interests": ["technology", "science", "psychology", "astrology"],
        "dislikes": ["crowded places", "nightclubs", "bars", "onion"],
    },
    {
        "full_name": "Camila Veloso de Freitas",
        "email": "",
        "birth_date": "1995-11-07",
        "drinks_alcohol": False,
        "smokes": False,
        "occupation": "clinical psychologist and astrologer",
        "interests": ["psychology", "astrology"],
        "dislikes": ["crowded places", "nightclubs", "bars"],
    },
]


def default_couple_profile() -> dict:
    return deepcopy(DEFAULT_COUPLE_PROFILE)


def default_members() -> list[dict]:
    return deepcopy(DEFAULT_MEMBERS)
