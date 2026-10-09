from workers import Response, fetch
from urllib.parse import urlencode
import json
import asyncio


async def tm_fetch():
    print("Fetching data...")
    restaurants = await get_resturants()
    # menu = await get_store_menu(
    #     restaurants["data"]["restaurants"]["nodes"][0]["storeId"]
    # )

    # # find if white hot chooclate is available in the menu

    # for element in menu["data"]["storeMenu"]:
    #     if element["id"] == "3ef90f5a-12af-48e9-a32c-d65450346382":
    #         print(element["isAvailable"])

    # return "blank"

    validStoreList = list()

    # loop all restaurants
    for element in restaurants["data"]["restaurants"]["nodes"]:
        menu = await get_store_menu(element["storeId"])

        # sift through all menu items and find the white chocolate one
        for menuElement in menu["data"]["storeMenu"]:
            if menuElement["id"] == "3ef90f5a-12af-48e9-a32c-d65450346382":
                if menuElement["isAvailable"] == True:
                    validStoreList.append(element)

        await asyncio.sleep(0.1)

    return validStoreList


async def get_resturants():
    payload = {
        "operationName": "GetRestaurants",
        "variables": {
            "input": {
                "filter": "NEARBY",
                "coordinates": {
                    "userLat": 43.66,
                    "userLng": -79.39,
                    "searchRadius": 1000,
                },
                "first": 20,
                "status": "OPEN",
            }
        },
        "query": """
query GetRestaurants($input: RestaurantsInput) {
  restaurants(input: $input) {
    pageInfo {
      hasNextPage
      endCursor
      __typename
    }
    totalCount
    nodes {
      ...RestaurantNodeFragment
      __typename
    }
    __typename
  }
}

fragment RestaurantNodeFragment on RestaurantNode {
  _id
  storeId
  isAvailable
  posVendor
  chaseMerchantId
  cateringHours {
    ...OperatingHoursFragment
    ...OperatingHoursFragment
    __typename
  }
  curbsideHours {
    ...OperatingHoursFragment
    __typename
  }
  cateringHours {
    ...OperatingHoursFragment
    __typename
  }
  timezone
  deliveryHours {
    ...OperatingHoursFragment
    __typename
  }
  diningRoomHours {
    ...OperatingHoursFragment
    __typename
  }
  distanceInMiles
  drinkStationType
  driveThruHours {
    ...OperatingHoursFragment
    __typename
  }
  driveThruLaneType
  email
  environment
  franchiseGroupId
  franchiseGroupName
  frontCounterClosed
  hasBreakfast
  hasBurgersForBreakfast
  hasCatering
  hasCurbside
  hasDelivery
  hasDineIn
  hasDriveThru
  hasTableService
  hasMobileOrdering
  hasLateNightMenu
  hasParking
  hasPlayground
  hasTakeOut
  hasWifi
  hasLoyalty
  id
  isDarkKitchen
  isFavorite
  isHalal
  isRecent
  latitude
  longitude
  mobileOrderingStatus
  name
  number
  parkingType
  phoneNumber
  physicalAddress {
    address1
    address2
    city
    country
    postalCode
    stateProvince
    stateProvinceShort
    __typename
  }
  playgroundType
  pos {
    vendor
    __typename
  }
  posRestaurantId
  restaurantImage {
    asset {
      _id
      metadata {
        lqip
        palette {
          dominant {
            background
            foreground
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
    crop {
      top
      bottom
      left
      right
      __typename
    }
    hotspot {
      height
      width
      x
      y
      __typename
    }
    __typename
  }
  restaurantPosData {
    _id
    __typename
  }
  status
  vatNumber
  timezone
  __typename
}

fragment OperatingHoursFragment on OperatingHours {
  friClose
  friOpen
  monClose
  monOpen
  satClose
  satOpen
  sunClose
  sunOpen
  thrClose
  thrOpen
  tueClose
  tueOpen
  wedClose
  wedOpen
  __typename
}""",
    }

    response = await fetch(
        "https://use1-prod-th.rbictg.com/graphql",
        method="POST",
        headers={"Content-Type": "application/json"},
        body=json.dumps(payload),
    )

    result = await Response.json(response)

    return result


async def get_store_menu(store_id):
    payload = {
        "operationName": "storeMenu",
        "variables": json.dumps(
            {
                "channel": "whitelabel",
                "region": "CA",
                "storeId": store_id,
                "serviceMode": "pickup",
            }
        ),
        "extensions": json.dumps(
            {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": "713eb1f46bf8b3ba1a867c65d0e0fd2a879cf0e2d1d3e9788addda059e617cc0",
                }
            }
        ),
    }

    response = await fetch(
        "https://use1-prod-th-gateway.rbictg.com/graphql?operationName="
        + payload["operationName"]
        + "&variables="
        + payload["variables"]
        + "&extensions="
        + payload["extensions"]
    )

    result = await Response.json(response)
    return result
